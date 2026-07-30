-- Run this in your Supabase SQL Editor to enable Vendor Authentication

create table if not exists public.vendor_credentials (
  username text primary key,
  password text not null
);

-- Seed with a default secure login for the demo
insert into public.vendor_credentials (username, password)
values ('admin', 'ahead123')
on conflict (username) do update set password = excluded.password;

-- Allow anonymous read access so the frontend can verify logins during the demo
alter table public.vendor_credentials enable row level security;

drop policy if exists "Allow public read access to vendor_credentials" on public.vendor_credentials;
create policy "Allow public read access to vendor_credentials"
  on public.vendor_credentials
  for select
  to public
  using (true);

drop policy if exists "Allow public update access to vendor_credentials" on public.vendor_credentials;
create policy "Allow public update access to vendor_credentials"
  on public.vendor_credentials
  for update
  to public
  using (true)
  with check (true);
