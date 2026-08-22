/* ============================================================
   POST /.netlify/functions/verify-payment
   Verifies the signature Razorpay Checkout returns after a
   payment attempt. The frontend must not treat a payment as
   successful until this function responds { verified: true }.
   ============================================================ */
"use strict";

const crypto = require("crypto");

const JSON_HEADERS = { "Content-Type": "application/json" };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { verified: false, error: "Method not allowed." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { verified: false, error: "Invalid request body." });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderRef } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return respond(400, { verified: false, error: "Missing payment details." });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    console.error("verify-payment: missing RAZORPAY_KEY_SECRET env var");
    return respond(500, { verified: false, error: "Payment verification is temporarily unavailable." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(String(razorpay_signature), "utf8");

  const isValid =
    expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    console.warn("verify-payment: signature mismatch", { orderRef, razorpay_order_id });
    return respond(400, { verified: false, error: "Payment verification failed." });
  }

  // Signature is valid -> Razorpay confirms this payment belongs to
  // this order and was not tampered with in transit.
  return respond(200, {
    verified: true,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    orderRef: orderRef || null,
    status: "paid",
  });
};

function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
