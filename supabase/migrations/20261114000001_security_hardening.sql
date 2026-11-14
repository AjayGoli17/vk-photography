-- Security hardening: rate limiting + function hardening

-- ---------- rate limiting (used by Netlify Functions via the service role) ----------
create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_key_time_idx on public.rate_limits (key, created_at desc);
alter table public.rate_limits enable row level security;  -- no policies: service role only

-- Returns true if the call is allowed (and records it), false if the limit is exceeded.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  -- serialise concurrent calls for the same key
  perform pg_advisory_xact_lock(hashtext(p_key));

  select count(*) into recent
  from public.rate_limits
  where key = p_key and created_at > now() - make_interval(secs => p_window_seconds);

  if recent >= p_max then
    return false;
  end if;

  insert into public.rate_limits (key) values (p_key);

  -- opportunistic cleanup so the table never grows without bound
  if random() < 0.02 then
    delete from public.rate_limits where created_at < now() - interval '1 day';
  end if;
  return true;
end $$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------- function hardening ----------
-- Fixed search_path (Supabase linter: "function search path mutable").
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- Only signed-in users have any reason to call is_admin() (the admin page does).
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---------- data integrity ----------
alter table public.orders
  add constraint orders_amounts_check check (subtotal >= 0 and shipping >= 0 and total = subtotal + shipping) not valid;
alter table public.orders validate constraint orders_amounts_check;
