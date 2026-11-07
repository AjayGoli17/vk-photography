/* ============================================================
   POST /.netlify/functions/webhook
   Razorpay webhook endpoint. Configure this URL in the Razorpay
   Dashboard (Settings > Webhooks) for at least:
     - payment.captured
     - payment.failed

   Security:
   - Every request's signature is verified against
     RAZORPAY_WEBHOOK_SECRET before the payload is trusted.
   - The raw request body (not the re-serialized JSON) is what
     gets hashed, since Razorpay signs the exact bytes it sent.

   Idempotency:
   - This site has no database, so we keep a small in-memory set of
     already-processed event ids as a best-effort guard within a
     single warm function instance. It does NOT provide true
     idempotency across cold starts or multiple concurrent
     instances — see README/limitations. A production deployment
     should persist processed event ids (e.g. in a database or a
     durable key-value store) and check/set that atomically here.
   ============================================================ */
"use strict";

const crypto = require("crypto");

const JSON_HEADERS = { "Content-Type": "application/json" };

// Best-effort de-dupe cache for the lifetime of this function instance only.
const processedEventIds = new Set();
const MAX_CACHE_SIZE = 500;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  const signature = event.headers["x-razorpay-signature"] || event.headers["X-Razorpay-Signature"];
  if (!signature) {
    return respond(400, { error: "Missing webhook signature." });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("webhook: missing RAZORPAY_WEBHOOK_SECRET env var");
    return respond(500, { error: "Webhook is not configured." });
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");

  const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(String(signature), "utf8");
  const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    console.warn("webhook: invalid signature");
    return respond(400, { error: "Invalid signature." });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return respond(400, { error: "Invalid payload." });
  }

  const eventId = event.headers["x-razorpay-event-id"] || event.headers["X-Razorpay-Event-Id"] || payload.id;
  if (eventId) {
    if (processedEventIds.has(eventId)) {
      // Already handled this event on this instance — acknowledge without reprocessing.
      return respond(200, { received: true, duplicate: true });
    }
    processedEventIds.add(eventId);
    if (processedEventIds.size > MAX_CACHE_SIZE) {
      processedEventIds.delete(processedEventIds.values().next().value);
    }
  }

  const paymentEntity = payload?.payload?.payment?.entity;

  switch (payload.event) {
    case "payment.captured":
      // In production: mark the matching order paid in your database,
      // keyed by paymentEntity.order_id / paymentEntity.id, and only
      // trigger fulfillment/notifications if it wasn't already marked.
      console.log("webhook: payment.captured", paymentEntity?.id, paymentEntity?.order_id);
      break;
    case "payment.failed":
      console.log("webhook: payment.failed", paymentEntity?.id, paymentEntity?.order_id);
      break;
    default:
      // Ignore events we don't act on.
      break;
  }

  return respond(200, { received: true });
};

function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
