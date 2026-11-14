/* Shared helpers for Netlify Functions: Supabase (service role) + Telegram alerts.
   The service key lives only in Netlify environment variables. Never ship it to the browser. */
"use strict";

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
async function allowRequest(event, bucket, max, windowSeconds) {
  try {
    const { data, error } = await db().rpc("check_rate_limit", {
      p_key: `${bucket}:${clientIp(event)}`, p_max: max, p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return data !== false;
  } catch (err) {
    console.error("rate-limit check failed (allowing request)", err?.message || err);
    return true;
  }
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

/* Marks an order paid exactly once. Safe to call from both verify-payment and the
   webhook: only the call that flips the status gets changed=true (and sends the alert).

   amountPaise/currency are the amount Razorpay says was actually paid. The order is only
   marked paid if that matches what we saved for the order AND the saved line items still add
   up to that total. Anything else is left unpaid and flagged for manual review, so a
   payment for one amount can never be used to "buy" a different cart. */
async function markOrderPaid(razorpayOrderId, razorpayPaymentId, amountPaise, currency) {
  const supabase = db();

  const { data: current, error: curErr } = await supabase
    .from("orders")
    .select("id, order_ref, status, subtotal, shipping, total, order_items(unit_price, quantity)")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();
  if (curErr) throw curErr;
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

module.exports = { db, respond, notifyTelegram, markOrderPaid, allowRequest, clientIp, oneLine, PHOTO_BUCKET };
