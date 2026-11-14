-- Automatic photo cleanup (used by netlify/functions/cleanup-photos.js)

-- 1) Bookkeeping on orders
alter table public.orders add column if not exists photos_deleted_at timestamptz;  -- set when the files were removed
alter table public.orders add column if not exists keep_photos boolean not null default false;  -- manual hold: never auto-delete

create index if not exists orders_photo_cleanup_idx
  on public.orders (status, updated_at)
  where photos_deleted_at is null and keep_photos = false;

-- 2) Files whose order ref never became an order, and whose newest file is older than the cutoff.
--    (Finds only. Deleting must go through the Storage API so the real files are removed.)
create or replace function public.cleanup_orphan_files(p_older_than_hours integer, p_limit integer)
returns table(path text)
language sql
security definer
set search_path = public, storage
as $$
  with refs as (
    select split_part(name, '/', 1) as ref, max(created_at) as newest
    from storage.objects
    where bucket_id = 'order-photos'
    group by 1
  )
  select o.name::text
  from storage.objects o
  join refs r on r.ref = split_part(o.name, '/', 1)
  where o.bucket_id = 'order-photos'
    and r.newest < now() - make_interval(hours => p_older_than_hours)
    and o.name ~ '^VK[A-HJ-NP-Z2-9]{6}/[A-Za-z0-9_-]{1,60}\.(jpg|png|webp)$'
    and not exists (select 1 from public.orders ord where ord.order_ref = r.ref)
  order by o.created_at
  limit greatest(p_limit, 0);
$$;

-- 3) Ownership claims that no longer protect anything (no order, no files left). p_dry = only count.
create or replace function public.cleanup_stale_claims(p_hours integer, p_dry boolean default true)
returns integer
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  n integer;
begin
  if p_dry then
    select count(*) into n
    from public.order_claims c
    where c.created_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from public.orders o where o.order_ref = c.order_ref)
      and not exists (select 1 from storage.objects s where s.bucket_id = 'order-photos' and s.name like c.order_ref || '/%');
    return n;
  end if;

  with gone as (
    delete from public.order_claims c
    where c.created_at < now() - make_interval(hours => p_hours)
      and not exists (select 1 from public.orders o where o.order_ref = c.order_ref)
      and not exists (select 1 from storage.objects s where s.bucket_id = 'order-photos' and s.name like c.order_ref || '/%')
    returning 1
  )
  select count(*) into n from gone;
  return n;
end $$;

-- Service role only (the Netlify function). Browsers and the admin page can never call these.
revoke all on function public.cleanup_orphan_files(integer, integer) from public, anon, authenticated;
revoke all on function public.cleanup_stale_claims(integer, boolean) from public, anon, authenticated;
grant execute on function public.cleanup_orphan_files(integer, integer) to service_role;
grant execute on function public.cleanup_stale_claims(integer, boolean) to service_role;
