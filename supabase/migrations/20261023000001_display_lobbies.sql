begin;
alter table public.game_sessions alter column host_user_id drop not null;
alter table public.game_hubs add column mode text not null default 'key' check (mode in ('key','display'));
create unique index game_hubs_one_display_per_owner on public.game_hubs(owner_user_id) where mode='display';

create function public.open_display_lobby(p_user uuid,p_code text,p_hub_code text,p_state jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare h public.game_hubs; sid uuid; room_code text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  select * into h from public.game_hubs where owner_user_id=p_user and mode='display' for update;
  if h.id is null then
    insert into public.game_hubs(code,key_hash,owner_user_id,mode) values(p_hub_code,gen_random_uuid()::text,p_user,'display') returning * into h;
  end if;
  select id,code into sid,room_code from public.game_sessions where id=h.active_session_id and status='active';
  if sid is null then
    insert into public.game_sessions(code,host_user_id,state) values(p_code,null,p_state) returning id,code into sid,room_code;
    update public.game_hubs set active_session_id=sid,main_user_id=null where id=h.id;
  end if;
  insert into public.game_viewers(session_id,user_id) values(sid,p_user) on conflict do nothing;
  return jsonb_build_object('id',h.id,'code',h.code,'mode','display','isDisplayOwner',true,'sessionId',sid,'roomCode',room_code,'isManager',false);
end; $$;
revoke all on function public.open_display_lobby(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.open_display_lobby(uuid,text,text,jsonb) to service_role;

create function public.restart_display_lobby(p_session uuid,p_actor uuid,p_code text,p_player text,p_state jsonb,p_private jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare current_session public.game_sessions; h public.game_hubs; sid uuid;
begin
  select * into current_session from public.game_sessions where id=p_session for update;
  if current_session.id is null or current_session.status<>'active' or current_session.host_user_id is distinct from p_actor then raise exception 'Only the current leader can restart'; end if;
  select * into h from public.game_hubs where active_session_id=p_session and mode='display' for update;
  if h.id is null then raise exception 'Display not found'; end if;
  if not exists(select 1 from public.game_seats where session_id=p_session and user_id=p_actor) then raise exception 'Leader seat not found'; end if;
  update public.game_sessions set status='closed',version=version+1,updated_at=now() where id=p_session;
  insert into public.game_sessions(code,host_user_id,state) values(p_code,p_actor,p_state) returning id into sid;
  insert into public.game_seats(session_id,player_id,user_id) values(sid,p_player,p_actor);
  insert into public.game_player_private(session_id,player_id,payload) values(sid,p_player,p_private);
  insert into public.game_viewers(session_id,user_id) values(sid,h.owner_user_id);
  update public.game_hubs set active_session_id=sid where id=h.id;
  return sid;
end; $$;
revoke all on function public.restart_display_lobby(uuid,uuid,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.restart_display_lobby(uuid,uuid,text,text,jsonb,jsonb) to service_role;

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
    if exists(select 1 from public.game_sessions where id=p_session and status='active' and state->>'phase'='lobby' and state->>'lobbyMode'='first-player' and jsonb_array_length(state->'players')=0 and host_user_id is null) then
      update public.game_sessions set host_user_id=p_join_user where id=p_session;
    end if;
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

commit;
