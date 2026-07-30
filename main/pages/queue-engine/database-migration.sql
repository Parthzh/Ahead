-- Run once in the Supabase SQL Editor before using the upgraded app.
-- Atomically issues the next daily token and adds vendor priorities.

alter table public.orders
  add column if not exists priority text not null default 'normal'
  check (priority in ('normal', 'urgent', 'vip'));

alter table public.menu
  add column if not exists available boolean not null default true;

create or replace function public.next_order_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_counter integer;
begin
  update config
  set daily_token_counter = case
        when token_date = current_date then daily_token_counter + 1
        else 1
      end,
      token_date = current_date
  where id = 1
  returning daily_token_counter into next_counter;

  if next_counter is null then
    raise exception 'Configuration row 1 is missing';
  end if;

  return 'A-' || lpad(next_counter::text, 3, '0');
end;
$$;

grant execute on function public.next_order_token() to anon, authenticated;
