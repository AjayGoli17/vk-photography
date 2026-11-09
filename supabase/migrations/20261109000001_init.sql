-- VK Photography: orders, order items, products, leads, admin access, photo bucket

create extension if not exists pgcrypto;

-- ---------- admin access ----------
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;  -- no policies: service role only

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- orders ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text not null unique,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','payment_failed','paid','processing','shipped','delivered','cancelled','refunded')),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  subtotal integer not null,
  shipping integer not null,
  total integer not null,
  tracking_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  shipped_at timestamptz
);
create index orders_status_idx on public.orders (status, created_at desc);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- order items (one row per cart line) ----------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id text not null,
  kind text not null check (kind in ('frame','gift')),
  product_id text,            -- gifts
  frame_id text,              -- frames
  size_id text,
  size_label text,
  quality_id text,
  mounting_id text,
  orientation text,
  quantity integer not null check (quantity > 0),
  unit_price integer not null,
  photo_path text,            -- path inside the private order-photos bucket
  photo_width integer,
  photo_height integer,
  crop jsonb                  -- {x, y, scale, unit, windowW, windowH}
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- products (seeded from js/shop-pricing.js) ----------
create table public.products (
  id text primary key,
  kind text not null check (kind in ('frame','gift')),
  name text not null,
  description text,
  price integer,              -- gifts: full price
  price_modifier integer,     -- frames: added on top of print price
  image text,
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ---------- leads (quotation + contact forms) ----------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('quotation','contact')),
  name text not null,
  phone text,
  email text,
  service text,
  event_date date,
  location text,
  guests integer,
  estimated_total integer,
  message text,
  details jsonb,
  status text not null default 'new' check (status in ('new','contacted','booked','lost')),
  created_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, created_at desc);

-- ---------- webhook log (duplicate protection) ----------
create table public.webhook_events (
  event_id text primary key,
  event_type text,
  payload jsonb,
  received_at timestamptz not null default now()
);

-- ---------- Row Level Security: admin only ----------
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.products       enable row level security;
alter table public.leads          enable row level security;
alter table public.webhook_events enable row level security;

create policy "admin all" on public.orders         for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.order_items    for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.products       for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.leads          for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.webhook_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- private photo bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('order-photos', 'order-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "admin read order photos" on storage.objects
  for select to authenticated using (bucket_id = 'order-photos' and public.is_admin());
create policy "admin delete order photos" on storage.objects
  for delete to authenticated using (bucket_id = 'order-photos' and public.is_admin());
