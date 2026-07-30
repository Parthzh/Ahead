-- Run this in your Supabase SQL Editor to enable Squad Carts

create table if not exists public.squad_sessions (
  id uuid default gen_random_uuid() primary key,
  session_code text unique not null,
  master_cart jsonb default '[]'::jsonb,
  status text default 'open',
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.squad_sessions enable row level security;

-- Allow anonymous access for the demo
drop policy if exists "Allow public access to squad_sessions" on public.squad_sessions;
create policy "Allow public access to squad_sessions"
  on public.squad_sessions
  for all
  to public
  using (true)
  with check (true);

-- Enable Realtime for squad_sessions (this allows the multiplayer cart sync)
DO $$ 
BEGIN
  -- Remove the table from publication if it exists to avoid errors
  alter publication supabase_realtime drop table public.squad_sessions;
EXCEPTION WHEN OTHERS THEN
  -- Ignore error if not in publication
END $$;

alter publication supabase_realtime add table public.squad_sessions;
