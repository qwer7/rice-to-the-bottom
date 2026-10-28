begin;

create table public.game_viewers (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (session_id, user_id)
);
create table public.game_player_private (
  session_id uuid not null,
  player_id text not null,
  payload jsonb not null,
  primary key (session_id, player_id),
  foreign key (session_id, player_id) references public.game_seats(session_id, player_id) on delete cascade
);
alter table public.game_viewers enable row level security;
alter table public.game_player_private enable row level security;
-- Private hands, deck order and draft cards have no client-readable policy.

create or replace function public.can_access_game_session(target_session_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.game_sessions s where s.id = target_session_id and s.host_user_id = auth.uid())
    or exists (select 1 from public.game_seats s where s.session_id = target_session_id and s.user_id = auth.uid())
    or exists (select 1 from public.game_viewers v where v.session_id = target_session_id and v.user_id = auth.uid());
$$;

-- One row lock commits the public state, private hands and joining seats together.
-- A stale version raises 40001 so the Edge Function can retry using fresh data.
create function public.commit_v2_game(
  p_session uuid, p_version integer, p_state jsonb, p_private jsonb,
  p_status text default 'active', p_join_user uuid default null, p_join_player text default null
) returns setof public.game_sessions
language plpgsql security definer set search_path = public as $$
declare current_version integer; item record;
begin
  select version into current_version from public.game_sessions where id = p_session for update;
  if current_version is null then raise exception 'Room not found'; end if;
  if current_version <> p_version then raise exception 'State changed' using errcode = '40001'; end if;
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
revoke all on function public.commit_v2_game(uuid, integer, jsonb, jsonb, text, uuid, text) from public, anon, authenticated;
grant execute on function public.commit_v2_game(uuid, integer, jsonb, jsonb, text, uuid, text) to service_role;

-- Return a consistent snapshot; private data is limited to the caller's own hand.
create function public.read_v2_game(p_session uuid, p_user uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('session', to_jsonb(s), 'playerId', seat.player_id,
    'isHost', s.host_user_id = p_user,
    'private', case when secret.payload is null then null else jsonb_build_object(
      'hand', secret.payload->'hand', 'selectedCardId', secret.payload->'selectedCardId', 'exchanged', secret.payload->'exchanged') end)
  from public.game_sessions s
  left join public.game_seats seat on seat.session_id = s.id and seat.user_id = p_user
  left join public.game_player_private secret on secret.session_id = s.id and secret.player_id = seat.player_id
  where s.id = p_session and (s.host_user_id = p_user or seat.user_id is not null or exists
    (select 1 from public.game_viewers v where v.session_id = s.id and v.user_id = p_user));
$$;
revoke all on function public.read_v2_game(uuid, uuid) from public, anon, authenticated;
grant execute on function public.read_v2_game(uuid, uuid) to service_role;
commit;
