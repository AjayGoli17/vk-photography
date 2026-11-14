/* GET /.netlify/functions/order-status?orderRef=VKXXXXXX   (header: x-order-token)
   Lets the browser recover after a UPI app round-trip. Returns ONLY a coarse status, and only to
   the browser that owns the order (secret token). A wrong ref and a wrong token both look like
   "unknown", so refs can't be probed. */
"use strict";
const { db, respond, allowRequest, hashToken, safeEqual, TOKEN_RE } = require("./_lib/db");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return respond(405, { error: "Method not allowed." });
  if (!(await allowRequest(event, "order-status", 60, 600))) return respond(429, { error: "Too many requests. Please try again shortly." });
  const orderRef = event.queryStringParameters && event.queryStringParameters.orderRef;
  if (!orderRef || !/^VK[A-HJ-NP-Z2-9]{6}$/.test(orderRef)) return respond(400, { error: "Invalid order reference." });
  const token = (event.headers || {})["x-order-token"];
  try {
    const { data, error } = await db().from("orders").select("status, token_hash").eq("order_ref", orderRef).maybeSingle();
    if (error) throw error;
    if (!data || !data.token_hash || typeof token !== "string" || !TOKEN_RE.test(token) || !safeEqual(data.token_hash, hashToken(token))) {
      return respond(404, { status: "unknown" });
    }
    // Only the payment-related outcome is shared; fulfilment states all read as "paid".
    const PAID = ["paid", "processing", "shipped", "delivered"];
    return respond(200, { status: PAID.includes(data.status) ? "paid" : data.status });
  } catch (err) {
    console.error("order-status failed", err?.message || err);
    return respond(502, { error: "Could not check the order." });
  }
};
