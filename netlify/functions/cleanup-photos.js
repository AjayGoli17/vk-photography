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
