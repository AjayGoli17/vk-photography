/* Shared helpers for Netlify Functions: Supabase (service role), Telegram alerts,
   rate limiting, order-ownership tokens and form anti-spam tokens.
   The service key lives only in Netlify environment variables. Never ship it to the browser. */
"use strict";

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

let client;
function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

const PHOTO_BUCKET = "order-photos";
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

/* Collapses control characters and newlines so user-supplied text can't fake extra lines
   (e.g. a forged "New paid order" alert) inside a Telegram message. */
function oneLine(v, max = 120) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/* The caller's IP as seen by Netlify's edge (not spoofable via x-forwarded-for). */
function clientIp(event) {
  const h = (event && event.headers) || {};
  return String(h["x-nf-client-connection-ip"] || (h["x-forwarded-for"] || "").split(",")[0] || "unknown").trim().slice(0, 64);
}

/* Fixed-window rate limit backed by public.check_rate_limit(). Returns true if allowed.
   Fails OPEN on database errors so a Supabase blip never blocks real customers. */
async function rateOk(key, max, windowSeconds) {
  try {
    const { data, error } = await db().rpc("check_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
    if (error) throw error;
    return data !== false;
  } catch (err) {
    console.error("rate-limit check failed (allowing request)", err?.message || err);
    return true;
  }
}
const allowRequest = (event, bucket, max, windowSeconds) => rateOk(`${bucket}:${clientIp(event)}`, max, windowSeconds);
/* One shared counter for everybody: stops a botnet that rotates IP addresses. */
const allowGlobal = (bucket, max, windowSeconds) => rateOk(`${bucket}:global`, max, windowSeconds);

/* ---------- tokens ---------- */
const TOKEN_RE = /^[A-Za-z0-9]{32,64}$/;
const hashToken = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* An order ref is only usable by the browser that first claimed it with its secret orderToken.
   Returns true if this token owns the ref (claiming it if nobody has yet). */
async function claimOrderRef(orderRef, orderToken) {
  if (typeof orderToken !== "string" || !TOKEN_RE.test(orderToken)) return false;
  const h = hashToken(orderToken);
  const supabase = db();

  // An order saved by create-order already has its owner hash: that is the authority.
  const { data: order, error: oErr } = await supabase.from("orders").select("token_hash").eq("order_ref", orderRef).maybeSingle();
  if (oErr) throw oErr;
  if (order && order.token_hash) return safeEqual(order.token_hash, h);

  // Otherwise the first caller to claim the ref owns it.
  const { error: insErr } = await supabase.from("order_claims").upsert({ order_ref: orderRef, token_hash: h }, { onConflict: "order_ref", ignoreDuplicates: true });
  if (insErr) throw insErr;
  const { data: claim, error: cErr } = await supabase.from("order_claims").select("token_hash").eq("order_ref", orderRef).maybeSingle();
  if (cErr) throw cErr;
  return !!claim && safeEqual(claim.token_hash, h);
}

/* ---------- browser-origin and form anti-spam helpers ---------- */
/* Stops other websites using a visitor's browser to call our forms. (Scripts can fake this header,
   so it is one layer of several, not the only one.) */
function originAllowed(event) {
  const h = (event && event.headers) || {};
  const raw = h.origin || h.referer || "";
  if (!raw) return false;
  let host;
  try { host = new URL(raw).hostname.toLowerCase(); } catch { return false; }
  const extra = String(process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return host === "vkphotography.studio" || host.endsWith(".vkphotography.studio") ||
    host.endsWith(".netlify.app") || host === "localhost" || host === "127.0.0.1" || extra.includes(host);
}

function formSecret() {
  const s = process.env.FORM_TOKEN_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (!s) throw new Error("Set FORM_TOKEN_SECRET in Netlify environment variables");
  return s;
}
const formSig = (ts) => crypto.createHmac("sha256", formSecret()).update("form:" + ts).digest("hex").slice(0, 32);
/* A signed timestamp handed out when the form page loads. Submissions must carry one that is
   at least 3 seconds old (no human submits faster) and less than 2 hours old. */
function signFormToken() { const ts = Date.now().toString(36); return `${ts}.${formSig(ts)}`; }
function checkFormToken(token, minAgeMs = 3000, maxAgeMs = 2 * 3600 * 1000) {
  if (typeof token !== "string" || token.length > 80) return "invalid";
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !safeEqual(sig, formSig(ts))) return "invalid";
  const age = Date.now() - parseInt(ts, 36);
  if (!(age >= 0)) return "invalid";
  if (age < minAgeMs) return "too_fast";
  if (age > maxAgeMs) return "expired";
  return "ok";
}

/* Best-effort Telegram message to the studio owner. Never throws. */
async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (err) {
    console.error("telegram: send failed", err?.message || err);
  }
}

/* Marks an order paid exactly once. Safe to call from both verify-payment and the webhook.
   The order is found by ANY Razorpay order id created for it (so a payment made on an earlier
   checkout attempt still lands on the right order), and is only marked paid if the amount Razorpay
   took matches the saved total and the saved line items still add up. Anything else is left
   unpaid and flagged for manual review via Telegram. */
async function markOrderPaid(razorpayOrderId, razorpayPaymentId, amountPaise, currency) {
  const supabase = db();
  const SELECT = "id, order_ref, status, subtotal, shipping, total, order_items(unit_price, quantity)";

  let { data: current, error: curErr } = await supabase.from("orders").select(SELECT).eq("razorpay_order_id", razorpayOrderId).maybeSingle();
  if (curErr) throw curErr;
  if (!current) {
    const { data: link, error: linkErr } = await supabase.from("razorpay_order_links").select("order_id").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
    if (linkErr) console.error("markOrderPaid: link lookup failed (has the round-2 migration been run?)", linkErr.message);
    if (link) {
      const r = await supabase.from("orders").select(SELECT).eq("id", link.order_id).maybeSingle();
      if (r.error) throw r.error;
      current = r.data;
    }
  }
  if (!current) return { changed: false, order: null, reason: "unknown_order" };
  if (!["awaiting_payment", "payment_failed"].includes(current.status)) {
    return { changed: false, order: null, reason: "already_processed" };
  }

  const itemsTotal = (current.order_items || []).reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const expectedPaise = current.total * 100;
  const amountOk = Number.isInteger(amountPaise) && amountPaise === expectedPaise;
  const currencyOk = !currency || currency === "INR";
  const itemsOk = itemsTotal + current.shipping === current.total && itemsTotal === current.subtotal;
  if (!amountOk || !currencyOk || !itemsOk) {
    console.error("markOrderPaid: mismatch", { ref: current.order_ref, amountPaise, expectedPaise, itemsTotal, total: current.total });
    await notifyTelegram(
      `⚠️ Payment needs manual review: ${oneLine(current.order_ref, 20)}\n` +
      `Razorpay payment ${oneLine(razorpayPaymentId, 40)} · paid ₹${Number.isInteger(amountPaise) ? amountPaise / 100 : "?"}, order total ₹${current.total}`
    );
    return { changed: false, order: null, reason: "amount_mismatch" };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status: "paid", razorpay_payment_id: razorpayPaymentId || null, paid_at: new Date().toISOString() })
    .eq("id", current.id)
    .in("status", ["awaiting_payment", "payment_failed"])
    .select("order_ref, customer_name, customer_phone, city, total");
  if (error) throw error;

  const order = data && data[0];
  if (order) {
    await notifyTelegram(
      `New paid order ${oneLine(order.order_ref, 20)}\n` +
      `₹${order.total} · ${oneLine(order.customer_name)} · ${oneLine(order.customer_phone, 30)} · ${oneLine(order.city)}`
    );
  }
  return { changed: !!order, order: order || null };
}

module.exports = {
  db, respond, notifyTelegram, markOrderPaid, allowRequest, allowGlobal, clientIp, oneLine,
  claimOrderRef, hashToken, safeEqual, TOKEN_RE, originAllowed, signFormToken, checkFormToken, PHOTO_BUCKET,
};
