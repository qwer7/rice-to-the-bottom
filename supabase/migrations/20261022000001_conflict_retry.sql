-- A stale snapshot returns no rows; callers reload and retry without an HTTP error.
create or replace function public.commit_v2_game(
  p_session uuid, p_version integer, p_state jsonb, p_private jsonb,
  p_status text default 'active', p_join_user uuid default null, p_join_player text default null
) returns setof public.game_sessions
language plpgsql security definer set search_path = public as $$
declare current_version integer; item record;
begin
  select version into current_version from public.game_sessions where id = p_session for update;
  if current_version is null then raise exception 'Room not found'; end if;
  if current_version <> p_version then return; end if;
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
