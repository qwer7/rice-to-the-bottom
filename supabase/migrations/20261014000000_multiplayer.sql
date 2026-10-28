create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null,
  submitted_player_ids jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.game_seats (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, player_id),
  unique (session_id, user_id)
);

create table public.game_influence_choices (
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  player_id text not null,
  choice jsonb not null,
  created_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

alter table public.game_sessions enable row level security;
alter table public.game_seats enable row level security;
alter table public.game_influence_choices enable row level security;

-- SECURITY DEFINER prevents the two access policies below from recursively
-- invoking one another through RLS. It returns a boolean only; no game data
-- becomes readable through this helper.
create function public.can_access_game_session(target_session_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.game_sessions sessions
    where sessions.id = target_session_id and sessions.host_user_id = auth.uid()
  ) or exists (
    select 1 from public.game_seats seats
    where seats.session_id = target_session_id and seats.user_id = auth.uid()
  );
$$;

create policy "participants can read their session"
on public.game_sessions for select to authenticated
using (public.can_access_game_session(id));

create policy "participants can read occupied seats"
on public.game_seats for select to authenticated
using (public.can_access_game_session(session_id));

-- All writes go through Edge Functions using the service key. In particular,
-- there is intentionally no SELECT policy for game_influence_choices.
alter publication supabase_realtime add table public.game_sessions;
