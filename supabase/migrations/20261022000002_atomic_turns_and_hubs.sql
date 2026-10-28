begin;
create table public.game_hubs (
 id uuid primary key default gen_random_uuid(), code text unique not null,
 key_hash text unique not null, owner_user_id uuid not null references auth.users(id),
 main_user_id uuid references auth.users(id), active_session_id uuid references public.game_sessions(id),
 created_at timestamptz not null default now()
);
alter table public.game_hubs enable row level security;
-- Key hashes and hub ownership are accessible only through authenticated Edge Functions.
create function public.connect_game_hub(p_hash text, p_user uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare h public.game_hubs; previous_main uuid;
begin
 select * into h from public.game_hubs where key_hash=p_hash for update;
 if h.id is null then return null; end if;
 -- A key signs in the single manager. Transferring it revokes the previous manager.
 if h.active_session_id is not null and not exists(select 1 from public.game_seats where session_id=h.active_session_id and user_id=p_user) then
   select host_user_id into previous_main from public.game_sessions where id=h.active_session_id for update;
   update public.game_seats set user_id=p_user where session_id=h.active_session_id and user_id=previous_main;
 end if;
 update public.game_hubs set main_user_id=p_user where id=h.id;
 if h.active_session_id is not null then
   update public.game_sessions set host_user_id=p_user, version=version+1 where id=h.active_session_id;
 end if;
 return jsonb_build_object('id',h.id,'code',h.code,'sessionId',h.active_session_id,'isManager',true);
end; $$;
revoke all on function public.connect_game_hub(text,uuid) from public,anon,authenticated;
grant execute on function public.connect_game_hub(text,uuid) to service_role;
create function public.create_hub_room(p_hub uuid,p_user uuid,p_code text,p_player text,p_state jsonb,p_private jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare h public.game_hubs; sid uuid;
begin
 select * into h from public.game_hubs where id=p_hub for update;
 if h.main_user_id is distinct from p_user then raise exception 'Only the hub manager can create a lobby'; end if;
 if exists(select 1 from public.game_sessions where id=h.active_session_id and status='active') then
   raise exception 'Close the current lobby first'; end if;
 insert into public.game_sessions(code,host_user_id,state) values(p_code,p_user,p_state) returning id into sid;
 insert into public.game_seats(session_id,player_id,user_id) values(sid,p_player,p_user);
 insert into public.game_player_private(session_id,player_id,payload) values(sid,p_player,p_private);
 update public.game_hubs set active_session_id=sid where id=h.id;
 return sid;
end; $$;
revoke all on function public.create_hub_room(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_hub_room(uuid,uuid,text,text,jsonb,jsonb) to service_role;
-- A stale snapshot returns no rows; callers reload and retry without an HTTP error.
create or replace function public.commit_v3_game(
  p_session uuid, p_version integer, p_state jsonb, p_private jsonb,
  p_status text default 'active', p_join_user uuid default null, p_join_player text default null, p_remove_player text default null, p_actor uuid default null, p_host_only boolean default false
) returns setof public.game_sessions
language plpgsql security definer set search_path = public as $$
declare current_version integer; item record;
begin
  select version into current_version from public.game_sessions where id = p_session for update;
  if current_version is null then raise exception 'Room not found'; end if;
  if current_version <> p_version then return; end if;
  if p_host_only and not exists(select 1 from public.game_sessions where id=p_session and host_user_id=p_actor) then raise exception 'Manager access revoked'; end if;
  if p_remove_player is not null then delete from public.game_seats where session_id=p_session and player_id=p_remove_player; end if;
  if p_join_user is not null then
    insert into public.game_seats(session_id, player_id, user_id) values(p_session, p_join_player, p_join_user);
  end if;
  for item in select key, value from jsonb_each(p_private) loop
    insert into public.game_player_private(session_id, player_id, payload) values(p_session, item.key, item.value)
      on conflict(session_id, player_id) do update set payload = excluded.payload;
  end loop;
  return query update public.game_sessions set state = p_state, status = p_status,
    submitted_player_ids = coalesce((select jsonb_agg(p->>'id') from jsonb_array_elements(p_state->'players') p where p->>'stage' = 'ready'), '[]'::jsonb),
    version = version + 1, updated_at = now() where id = p_session returning *;
end;
$$;

revoke all on function public.commit_v3_game(uuid,integer,jsonb,jsonb,text,uuid,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.commit_v3_game(uuid,integer,jsonb,jsonb,text,uuid,text,text,uuid,boolean) to service_role;
create function public.read_v3_game(p_session uuid, p_user uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('session', to_jsonb(s), 'playerId', seat.player_id,
    'isHost', s.host_user_id = p_user,
    'private', case when secret.payload is null then null else jsonb_build_object(
      'hand', secret.payload->'hand', 'selectedCardId', secret.payload->'selectedCardId', 'exchanged', secret.payload->'exchanged', 'exchangesUsed',secret.payload->'exchangesUsed', 'pending',secret.payload->'pending') end)
  from public.game_sessions s
  left join public.game_seats seat on seat.session_id = s.id and seat.user_id = p_user
  left join public.game_player_private secret on secret.session_id = s.id and secret.player_id = seat.player_id
  where s.id = p_session and (s.host_user_id = p_user or seat.user_id is not null or exists
    (select 1 from public.game_viewers v where v.session_id = s.id and v.user_id = p_user));
$$;
revoke all on function public.read_v3_game(uuid, uuid) from public, anon, authenticated;
grant execute on function public.read_v3_game(uuid, uuid) to service_role;
commit;
