/* ============================================================
   POST /.netlify/functions/webhook
   Razorpay webhook. Configure in Razorpay Dashboard > Settings > Webhooks
   for: payment.captured, payment.failed

   - Every request's signature is verified against RAZORPAY_WEBHOOK_SECRET
     using the raw request body.
   - Event ids are stored in the webhook_events table, so duplicates are
     ignored across cold starts and multiple instances.
   - payment.captured marks the order paid and sends a Telegram alert
     (only once, even if verify-payment got there first).
   ============================================================ */
"use strict";

const crypto = require("crypto");
const { db, respond, markOrderPaid } = require("./_lib/db");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });

  const signature = event.headers["x-razorpay-signature"] || event.headers["X-Razorpay-Signature"];
  if (!signature) return respond(400, { error: "Missing webhook signature." });

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("webhook: missing RAZORPAY_WEBHOOK_SECRET env var");
    return respond(500, { error: "Webhook is not configured." });
  }

  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "", "utf8");
  const expected = Buffer.from(crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex"), "utf8");
  const received = Buffer.from(String(signature), "utf8");
  if (!(expected.length === received.length && crypto.timingSafeEqual(expected, received))) {
    console.warn("webhook: invalid signature");
    return respond(400, { error: "Invalid signature." });
  }

  let payload;
  try { payload = JSON.parse(rawBody.toString("utf8")); } catch { return respond(400, { error: "Invalid payload." }); }

  const eventId = event.headers["x-razorpay-event-id"] || event.headers["X-Razorpay-Event-Id"] || payload.id;
  const payment = payload?.payload?.payment?.entity;

  try {
    const supabase = db();

    if (eventId) {
      const { data: seen, error } = await supabase.from("webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
      if (error) throw error;
      if (seen) return respond(200, { received: true, duplicate: true });
    }

    if (payload.event === "payment.captured" && payment?.order_id) {
      await markOrderPaid(payment.order_id, payment.id);
    } else if (payload.event === "payment.failed" && payment?.order_id) {
      // Only an unpaid order can move to payment_failed; a paid order is never downgraded.
      const { error } = await supabase.from("orders").update({ status: "payment_failed" })
        .eq("razorpay_order_id", payment.order_id).eq("status", "awaiting_payment");
      if (error) throw error;
    }

    if (eventId) {
      const { error } = await supabase.from("webhook_events")
        .upsert({ event_id: eventId, event_type: payload.event, payload }, { onConflict: "event_id", ignoreDuplicates: true });
      if (error) throw error;
    }
  } catch (err) {
    // 500 makes Razorpay retry the webhook later.
    console.error("webhook: processing failed", err?.message || err);
    return respond(500, { error: "Could not process the event." });
  }

  return respond(200, { received: true });
};
