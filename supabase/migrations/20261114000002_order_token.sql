-- Order ownership: only the browser that created an order can change it before payment.
alter table public.orders add column if not exists token_hash text;
