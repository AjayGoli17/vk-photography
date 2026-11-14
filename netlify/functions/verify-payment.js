/* ============================================================
   POST /.netlify/functions/verify-payment
   Verifies the signature Razorpay Checkout returns after a payment
   attempt, then marks the saved order as paid. The frontend must not
   treat a payment as successful until this responds { verified: true }.
   ============================================================ */
"use strict";

const crypto = require("crypto");
const Razorpay = require("razorpay");
const { respond, markOrderPaid, allowRequest } = require("./_lib/db");

const RZP_ID_RE = /^[A-Za-z0-9_]{6,64}$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { verified: false, error: "Method not allowed." });
  if (String(event.body || "").length > 4000) return respond(413, { verified: false, error: "Request too large." });
  if (!(await allowRequest(event, "verify-payment", 30, 600))) {
    return respond(429, { verified: false, error: "Too many attempts. Please wait a few minutes." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { verified: false, error: "Invalid request body." }); }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderRef } = body;
  if (
    typeof razorpay_order_id !== "string" || !RZP_ID_RE.test(razorpay_order_id) ||
    typeof razorpay_payment_id !== "string" || !RZP_ID_RE.test(razorpay_payment_id) ||
    typeof razorpay_signature !== "string" || razorpay_signature.length > 200
  ) {
    return respond(400, { verified: false, error: "Missing payment details." });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error("verify-payment: missing RAZORPAY_KEY_SECRET env var");
    return respond(500, { verified: false, error: "Payment verification is temporarily unavailable." });
  }

  const expectedSignature = crypto.createHmac("sha256", keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  const expected = Buffer.from(expectedSignature, "utf8");
  const received = Buffer.from(String(razorpay_signature), "utf8");
  const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    console.warn("verify-payment: signature mismatch", { orderRef, razorpay_order_id });
    return respond(400, { verified: false, error: "Payment verification failed." });
  }

  // The signature is genuine. Ask Razorpay what was actually paid so the amount can be checked
  // against the saved order before it is marked paid. If Razorpay or the database is briefly
  // unavailable the payment is still valid and the webhook will record it.
  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.order_id !== razorpay_order_id) {
      console.warn("verify-payment: payment/order mismatch", { razorpay_order_id, razorpay_payment_id });
      return respond(400, { verified: false, error: "Payment verification failed." });
    }
    await markOrderPaid(razorpay_order_id, razorpay_payment_id, payment.amount, payment.currency);
  } catch (err) {
    console.error("verify-payment: could not record payment", err?.message || err);
  }

  return respond(200, {
    verified: true,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    status: "paid",
  });
};
