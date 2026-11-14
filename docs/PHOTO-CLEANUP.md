# Automatic photo cleanup

`netlify/functions/cleanup-photos.js` runs every day at 03:00 IST (21:30 UTC, see `netlify.toml`) and
removes customer photos from the private `order-photos` bucket that are no longer needed.

| Case | Default rule | Action |
|---|---|---|
| Abandoned cart | Order ref never became an order; newest file older than 48 h | Delete files, drop stale `order_claims` row |
| Unpaid order | `awaiting_payment` / `payment_failed`, untouched for 7 days, **no payment at Razorpay** | Mark `cancelled` ("Auto-expired"), delete files |
| Delivered order | `shipped_at` older than 60 days | Delete files, keep order row |
| Cancelled / refunded | Older than 14 days | Delete files, keep order row |

Never touched: `paid`, `processing`, `shipped`, and any order with **Keep photos** ticked in the admin.
Deleted orders keep their row and `photo_path`; `photos_deleted_at` records when the files went.

## Safety
- **Dry run by default.** Until `CLEANUP_DRY_RUN=false` it only sends a Telegram report of what it would delete.
- Unpaid orders are checked against Razorpay first. A captured/authorized payment (or an unreachable Razorpay) means the order is skipped and you get an alert.
- Status is re-checked immediately before each delete; the cancel step is conditional on the order still being unpaid.
- At most `CLEANUP_MAX_FILES` (200) files and 15 orders per group per run, so a backlog clears over a few days.
- Only callable by Netlify's scheduler or with the `x-cleanup-secret` header, and limited to one run per 5 minutes.
- Floors on the settings (orphan >= 24 h, unpaid >= 2 days, ...) stop a typo from deleting live carts.

## Settings (Netlify > Site configuration > Environment variables)
`CLEANUP_DRY_RUN` (default true), `CLEANUP_SECRET`, `CLEANUP_ORPHAN_HOURS` (48), `CLEANUP_UNPAID_DAYS` (7),
`CLEANUP_DELIVERED_DAYS` (60), `CLEANUP_CANCELLED_DAYS` (14), `CLEANUP_MAX_FILES` (200).

## Go-live checklist
1. Run `supabase/migrations/20261116000001_photo_cleanup.sql` (Supabase SQL editor or `supabase db push`).
2. Set `CLEANUP_SECRET` (`openssl rand -hex 32`) in Netlify and deploy. Scheduled functions only run on the published production deploy.
3. Trigger a dry run and read the Telegram report:
   `curl -X POST -H "x-cleanup-secret: $CLEANUP_SECRET" "https://YOUR-SITE/.netlify/functions/cleanup-photos?dry=1"`
4. When the report looks right, set `CLEANUP_DRY_RUN=false` and redeploy.

## Known edge case
If the file delete fails right after an unpaid order was cancelled, the order is retried by the "cancelled" rule
after `CLEANUP_CANCELLED_DAYS`, and you get an error alert in the meantime.
