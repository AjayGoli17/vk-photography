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
const JSON_HEADERS = { "Content-Type": "application/json" };
function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
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
   webhook: only the call that flips the status gets changed=true (and sends the alert). */
async function markOrderPaid(razorpayOrderId, razorpayPaymentId) {
  const { data, error } = await db()
    .from("orders")
    .update({ status: "paid", razorpay_payment_id: razorpayPaymentId || null, paid_at: new Date().toISOString() })
    .eq("razorpay_order_id", razorpayOrderId)
    .in("status", ["awaiting_payment", "payment_failed"])
    .select("order_ref, customer_name, customer_phone, city, total");
  if (error) throw error;

  const order = data && data[0];
  if (order) {
    await notifyTelegram(
      `New paid order ${order.order_ref}\n` +
      `₹${order.total} · ${order.customer_name} · ${order.customer_phone} · ${order.city}`
    );
  }
  return { changed: !!order, order: order || null };
}

module.exports = { db, respond, notifyTelegram, markOrderPaid, PHOTO_BUCKET };
