-- Round 2 security fixes
-- 1) Order ownership claims: whoever uploads the first photo for an order ref owns it.
create table if not exists public.order_claims (
  order_ref  text primary key,
  token_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.order_claims enable row level security;   -- no policies: service role only

-- 2) Every Razorpay order ever created for a shop order, so a payment made on an
--    earlier checkout attempt can still be matched to the right order.
create table if not exists public.razorpay_order_links (
  razorpay_order_id text primary key,
  order_id          uuid not null references public.orders(id) on delete cascade,
  created_at        timestamptz not null default now()
);
alter table public.razorpay_order_links enable row level security;  -- service role only

-- 3) Housekeeping for rate limiting and unclaimed refs.
create index if not exists order_claims_created_idx on public.order_claims (created_at);
