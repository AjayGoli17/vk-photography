-- Admin 2FA: a password-only session (aal1) is no longer enough to act as admin.
-- Every "admin all" RLS policy and storage policy goes through is_admin(), so this one change covers them all.
-- Sign in once on /admin.html first and finish the authenticator setup, THEN run this (otherwise you lock yourself out of the admin page).
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
