#!/usr/bin/env bash
# =============================================================================
# apply-photo-cleanup.sh  —  adds automatic photo cleanup to vk-photography
# Run from the repo root:   bash apply-photo-cleanup.sh
#
# Creates : netlify/functions/cleanup-photos.js
#           supabase/migrations/20261116000001_photo_cleanup.sql
#           docs/PHOTO-CLEANUP.md
# Patches : netlify.toml (daily schedule), .env.example (settings),
#           public/js/admin.js ("photos removed" message + "Keep photos" tick box)
# Safe to re-run: it stops if the cleanup is already installed.
# =============================================================================
set -euo pipefail

[ -f netlify.toml ] && [ -f netlify/functions/_lib/db.js ] && [ -f public/js/admin.js ] || {
  echo "Run this from the vk-photography repo root (netlify.toml / netlify/functions / public/js/admin.js not found)." >&2; exit 1; }
command -v node >/dev/null || { echo "node is required (you already use it for the build)." >&2; exit 1; }
if [ -f netlify/functions/cleanup-photos.js ] || grep -q "photos_deleted_at" public/js/admin.js; then
  echo "Photo cleanup looks already installed. Nothing changed." >&2; exit 1; fi

mkdir -p supabase/migrations docs

echo "→ writing netlify/functions/cleanup-photos.js"
cat > netlify/functions/cleanup-photos.js <<'__CLEANUP_JS__'
/* ============================================================
   cleanup-photos  —  Netlify Scheduled Function (daily, see netlify.toml)

   Deletes customer photos that are no longer needed from the PRIVATE order-photos bucket:
     1. Orphans         files for an order ref that never became an order (abandoned cart)
     2. Unpaid orders   awaiting_payment / payment_failed and untouched for CLEANUP_UNPAID_DAYS
                        (Razorpay is asked first: an order with a payment is never expired)
     3. Finished orders delivered > CLEANUP_DELIVERED_DAYS ago, or cancelled/refunded > CLEANUP_CANCELLED_DAYS ago

   Never touches paid / processing / shipped orders, or orders with keep_photos = true.
   SAFE BY DEFAULT: runs as a dry run (report only) until CLEANUP_DRY_RUN=false is set in Netlify.

   Manual run (dry run forced):
     curl -X POST -H "x-cleanup-secret: $CLEANUP_SECRET" "https://YOUR-SITE/.netlify/functions/cleanup-photos?dry=1"
   ============================================================ */
"use strict";

const Razorpay = require("razorpay");
const { db, respond, notifyTelegram, allowGlobal, safeEqual, oneLine, PHOTO_BUCKET } = require("./_lib/db");

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const UNPAID = ["awaiting_payment", "payment_failed"];
const PATH_RE = /^VK[A-HJ-NP-Z2-9]{6}\/[A-Za-z0-9_-]{1,60}\.(jpg|png|webp)$/;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

/* Scheduled functions are killed after ~30 s, so stop starting new work after this. */
const TIME_BUDGET_MS = 22000;
const MAX_ORDERS_PER_GROUP = 15;

function settings(forceDry) {
  const n = (v, def, min) => { const x = Number(v); return Number.isFinite(x) && x > 0 ? Math.max(x, min) : def; };
  return {
    dryRun: forceDry || String(process.env.CLEANUP_DRY_RUN == null ? "true" : process.env.CLEANUP_DRY_RUN).trim().toLowerCase() !== "false",
    orphanHours: n(process.env.CLEANUP_ORPHAN_HOURS, 48, 24),      // floors stop a typo from deleting live carts
    unpaidDays: n(process.env.CLEANUP_UNPAID_DAYS, 7, 2),
    deliveredDays: n(process.env.CLEANUP_DELIVERED_DAYS, 60, 7),
    cancelledDays: n(process.env.CLEANUP_CANCELLED_DAYS, 14, 3),
    maxFiles: Math.floor(n(process.env.CLEANUP_MAX_FILES, 200, 10)),
  };
}

async function removeFiles(supabase, paths) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

async function filesOf(supabase, ref) {
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).list(ref, { limit: 100 });
  if (error) throw error;
  return (data || []).map((f) => `${ref}/${f.name}`).filter((p) => PATH_RE.test(p));
}

/* True if Razorpay holds a captured/authorized payment for ANY Razorpay order made for this shop order. */
async function razorpayHasPayment(rzp, supabase, order) {
  const ids = new Set(order.razorpay_order_id ? [order.razorpay_order_id] : []);
  const { data, error } = await supabase.from("razorpay_order_links").select("razorpay_order_id").eq("order_id", order.id);
  if (error) throw error;
  (data || []).forEach((r) => ids.add(r.razorpay_order_id));
  for (const id of ids) {
    const res = await rzp.orders.fetchPayments(id);
    if ((res.items || []).some((p) => p.status === "captured" || p.status === "authorized")) return true;
  }
  return false;
}

exports.handler = async (event) => {
  const h = (event && event.headers) || {};
  let body = {};
  try { body = JSON.parse((event && event.body) || "{}"); } catch { body = {}; }

  // Allowed callers: Netlify's scheduler (body carries next_run) or someone holding CLEANUP_SECRET.
  const secret = process.env.CLEANUP_SECRET;
  const manual = !!secret && typeof h["x-cleanup-secret"] === "string" && safeEqual(h["x-cleanup-secret"], secret);
  const scheduled = !!(body && body.next_run);
  if (!manual && !scheduled) return respond(401, { error: "Not allowed." });

  // The /api/* redirect makes every function public: one run per 5 minutes, whoever calls.
  if (!(await allowGlobal("cleanup-photos", 1, 300))) return respond(429, { error: "Cleanup ran recently. Try again in a few minutes." });

  const qs = (event && event.queryStringParameters) || {};
  const c = settings(manual && (qs.dry === "1" || qs.dry === "true"));
  const started = Date.now();
  const timeLeft = () => Date.now() - started < TIME_BUDGET_MS;

  const report = {
    dryRun: c.dryRun,
    orphans: { files: 0, refs: 0, claims: 0 },
    unpaid: { orders: 0, files: 0, skippedHasPayment: [] },
    finished: { orders: 0, files: 0 },
    errors: [],
  };
  let budget = c.maxFiles;

  try {
    const supabase = db();

    /* ---------- 1. orphans: files whose order ref never became an order ---------- */
    try {
      const { data, error } = await supabase.rpc("cleanup_orphan_files", { p_older_than_hours: c.orphanHours, p_limit: budget });
      if (error) throw error;
      const paths = (data || []).map((r) => r.path).filter((p) => PATH_RE.test(p));
      if (paths.length) {
        if (!c.dryRun) await removeFiles(supabase, paths);
        report.orphans.files = paths.length;
        report.orphans.refs = new Set(paths.map((p) => p.split("/")[0])).size;
        budget -= paths.length;
      }
      const { data: n, error: cErr } = await supabase.rpc("cleanup_stale_claims", { p_hours: c.orphanHours, p_dry: c.dryRun });
      if (cErr) throw cErr;
      report.orphans.claims = Number(n) || 0;
    } catch (err) {
      report.errors.push("orphans: " + oneLine(err?.message || err, 160) + " (has the photo-cleanup migration been run?)");
    }

    /* ---------- 2. unpaid orders ---------- */
    try {
      const keys = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
      if (!keys) throw new Error("Razorpay keys missing, so unpaid orders were not expired (cannot check for late payments)");
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

      const { data: rows, error } = await supabase.from("orders")
        .select("id, order_ref, status, razorpay_order_id, notes")
        .in("status", UNPAID).lt("updated_at", ago(c.unpaidDays * DAY))
        .eq("keep_photos", false).is("photos_deleted_at", null)
        .order("updated_at", { ascending: true }).limit(MAX_ORDERS_PER_GROUP);
      if (error) throw error;

      for (const row of rows || []) {
        if (budget <= 0 || !timeLeft()) break;
        try {
          // Fail closed: if Razorpay cannot be asked, this order is left alone.
          if (await razorpayHasPayment(rzp, supabase, row)) { report.unpaid.skippedHasPayment.push(row.order_ref); continue; }
          const files = await filesOf(supabase, row.order_ref);
          if (c.dryRun) { report.unpaid.orders++; report.unpaid.files += files.length; budget -= files.length; continue; }

          // Claim the order first (conditional on it still being unpaid), then delete its files.
          const note = [row.notes, `Auto-expired (unpaid) on ${new Date().toISOString().slice(0, 10)}`].filter(Boolean).join("\n");
          const { data: upd, error: uErr } = await supabase.from("orders")
            .update({ status: "cancelled", notes: note }).eq("id", row.id).in("status", UNPAID).select("id");
          if (uErr) throw uErr;
          if (!upd || !upd.length) continue; // status changed meanwhile (e.g. it just got paid)

          await removeFiles(supabase, files);
          const { error: dErr } = await supabase.from("orders").update({ photos_deleted_at: new Date().toISOString() }).eq("id", row.id);
          if (dErr) throw dErr;
          report.unpaid.orders++; report.unpaid.files += files.length; budget -= files.length;
        } catch (err) {
          report.errors.push(`unpaid ${row.order_ref}: ` + oneLine(err?.message || err, 120));
        }
      }
    } catch (err) {
      report.errors.push("unpaid: " + oneLine(err?.message || err, 160));
    }

    /* ---------- 3. finished orders ---------- */
    const finishedGroups = [
      () => supabase.from("orders").select("id, order_ref, status").eq("status", "delivered")
        .or(`shipped_at.lt.${ago(c.deliveredDays * DAY)},and(shipped_at.is.null,updated_at.lt.${ago(c.deliveredDays * DAY)})`),
      () => supabase.from("orders").select("id, order_ref, status").in("status", ["cancelled", "refunded"])
        .lt("updated_at", ago(c.cancelledDays * DAY)),
    ];
    for (const build of finishedGroups) {
      try {
        const { data: rows, error } = await build()
          .eq("keep_photos", false).is("photos_deleted_at", null)
          .order("updated_at", { ascending: true }).limit(MAX_ORDERS_PER_GROUP);
        if (error) throw error;

        for (const row of rows || []) {
          if (budget <= 0 || !timeLeft()) break;
          try {
            // Re-read right before deleting: an admin may have just changed it or ticked "keep photos".
            const { data: fresh, error: fErr } = await supabase.from("orders").select("status, keep_photos").eq("id", row.id).maybeSingle();
            if (fErr) throw fErr;
            if (!fresh || fresh.keep_photos || fresh.status !== row.status) continue;

            const files = await filesOf(supabase, row.order_ref);
            if (!c.dryRun) {
              await removeFiles(supabase, files);
              const { error: dErr } = await supabase.from("orders").update({ photos_deleted_at: new Date().toISOString() })
                .eq("id", row.id).eq("status", row.status).eq("keep_photos", false);
              if (dErr) throw dErr;
            }
            report.finished.orders++; report.finished.files += files.length; budget -= files.length;
          } catch (err) {
            report.errors.push(`finished ${row.order_ref}: ` + oneLine(err?.message || err, 120));
          }
        }
      } catch (err) {
        report.errors.push("finished: " + oneLine(err?.message || err, 160));
      }
    }
  } catch (err) {
    console.error("cleanup-photos failed", err?.message || err);
    report.errors.push("fatal: " + oneLine(err?.message || err, 160));
  }

  /* ---------- report (silent on a quiet day) ---------- */
  const o = report.orphans, u = report.unpaid, f = report.finished;
  const verb = c.dryRun ? "Would delete" : "Deleted";
  const lines = [];
  if (o.files || o.claims) lines.push(`${verb} ${o.files} photos from ${o.refs} abandoned carts` + (o.claims ? ` (+${o.claims} stale claims)` : ""));
  if (u.orders) lines.push(`${verb} ${u.files} photos from ${u.orders} unpaid orders${c.dryRun ? "" : " (marked cancelled)"}`);
  if (f.orders) lines.push(`${verb} ${f.files} photos from ${f.orders} finished orders`);
  if (u.skippedHasPayment.length) lines.push(`⚠️ Skipped (Razorpay shows a payment, check manually): ${u.skippedHasPayment.map((r) => oneLine(r, 12)).join(", ")}`);
  if (report.errors.length) lines.push("Errors: " + report.errors.slice(0, 5).join(" | "));
  if (lines.length) {
    await notifyTelegram(`🧹 Photo cleanup${c.dryRun ? " (DRY RUN, nothing deleted)" : ""}\n${lines.join("\n")}`);
  }
  console.log("cleanup-photos", JSON.stringify(report));
  return respond(200, report);
};
__CLEANUP_JS__

echo "→ writing supabase/migrations/20261116000001_photo_cleanup.sql"
cat > supabase/migrations/20261116000001_photo_cleanup.sql <<'__MIGRATION_SQL__'
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
__MIGRATION_SQL__

echo "→ writing docs/PHOTO-CLEANUP.md"
cat > docs/PHOTO-CLEANUP.md <<'__DOCS_MD__'
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
__DOCS_MD__

echo "→ patching netlify.toml"
cat >> netlify.toml <<'__TOML__'

# Daily photo cleanup: 03:00 IST = 21:30 UTC (see docs/PHOTO-CLEANUP.md)
[functions."cleanup-photos"]
  schedule = "30 21 * * *"
__TOML__

echo "→ patching .env.example"
[ -f .env.example ] && cat >> .env.example <<'__ENV__'

# --- Automatic photo cleanup (see docs/PHOTO-CLEANUP.md) ---
# Stays a DRY RUN (Telegram report only) until this is set to false.
CLEANUP_DRY_RUN=true
# Needed only to trigger a manual run:  openssl rand -hex 32
CLEANUP_SECRET=GENERATE_A_LONG_RANDOM_STRING
# Optional, defaults shown
CLEANUP_ORPHAN_HOURS=48
CLEANUP_UNPAID_DAYS=7
CLEANUP_DELIVERED_DAYS=60
CLEANUP_CANCELLED_DAYS=14
CLEANUP_MAX_FILES=200
__ENV__

echo "→ patching public/js/admin.js"
node - <<'__PATCH_ADMIN__'
const fs = require("fs");
const file = "public/js/admin.js";
let s = fs.readFileSync(file, "utf8");
function rep(anchor, replacement) {
  const parts = s.split(anchor);
  if (parts.length !== 2) { console.error("admin.js patch failed: expected exactly one match for:\n  " + anchor); process.exit(1); }
  s = parts.join(replacement);
}
// 1) carry the new columns into the order object
rep("shippedAt:r.shipped_at,lines:", "shippedAt:r.shipped_at,photosDeleted:r.photos_deleted_at||'',keep:!!r.keep_photos,lines:");
// 2) tell the owner when photos were auto-removed (instead of a broken-image error)
rep("if(!ls.length){box.textContent='No photos attached.';return}",
    "if(o.photosDeleted){box.textContent='Photos removed automatically on '+new Date(o.photosDeleted).toLocaleDateString('en-IN')+'.';return}if(!ls.length){box.textContent='No photos attached.';return}");
// 3) "Keep photos" tick box in the order drawer
rep('placeholder="Add a tracking number"></label>',
    'placeholder="Add a tracking number"></label>\n<label style="display:flex;gap:8px;align-items:center;margin:12px 0"><input type="checkbox" id="kp" ${o.keep?\'checked\':\'\'}> Keep photos (never auto-delete)</label>');
// 4) save it with the rest of the form
rep("x=tr!=o.track?{tracking_number:tr||null}:{};",
    "x=tr!=o.track?{tracking_number:tr||null}:{};{const kp=$('#kp');if(kp&&kp.checked!==o.keep)x.keep_photos=kp.checked};");
rep("if('shipped_at'in p)o.shippedAt=p.shipped_at;return true}",
    "if('shipped_at'in p)o.shippedAt=p.shipped_at;if('keep_photos'in p)o.keep=p.keep_photos;return true}");
fs.writeFileSync(file, s);
__PATCH_ADMIN__
node --check public/js/admin.js
node --check netlify/functions/cleanup-photos.js

cat <<'DONE'

✅ Photo cleanup installed (dry-run mode). Next steps:

  1. Create the database pieces (pick one):
       supabase db push
     or paste supabase/migrations/20261116000001_photo_cleanup.sql into Supabase > SQL Editor > Run.

  2. In Netlify > Site configuration > Environment variables add:
       CLEANUP_SECRET=$(openssl rand -hex 32)
     (CLEANUP_DRY_RUN is already "true" by default, so nothing is deleted yet.)

  3. Deploy:
       git add -A && git commit -m "Add automatic photo cleanup" && git push

  4. Trigger a dry run and read the Telegram report:
       curl -X POST -H "x-cleanup-secret: YOUR_SECRET" \
         "https://YOUR-SITE/.netlify/functions/cleanup-photos?dry=1"

  5. When the report looks right: set CLEANUP_DRY_RUN=false in Netlify and redeploy.

  Details and all settings: docs/PHOTO-CLEANUP.md
DONE
