/* GET /.netlify/functions/order-status?orderRef=VKXXXXXX
   Lets the browser recover after a UPI app round-trip. Returns ONLY a coarse status:
   no payment ids, no customer data. (Order refs are the only "password" here, so lookups
   are rate limited and refs must have the exact shape the shop generates.) */
"use strict";
const { db, respond, allowRequest } = require("./_lib/db");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return respond(405, { error: "Method not allowed." });
  if (!(await allowRequest(event, "order-status", 60, 600))) return respond(429, { error: "Too many requests. Please try again shortly." });
  const orderRef = event.queryStringParameters && event.queryStringParameters.orderRef;
  if (!orderRef || !/^VK[A-HJ-NP-Z2-9]{6}$/.test(orderRef)) return respond(400, { error: "Invalid order reference." });
  try {
    const { data, error } = await db().from("orders").select("status").eq("order_ref", orderRef).maybeSingle();
    if (error) throw error;
    if (!data) return respond(404, { status: "unknown" });
    // Only the payment-related outcome is shared; fulfilment states all read as "paid".
    const PAID = ["paid", "processing", "shipped", "delivered"];
    return respond(200, { status: PAID.includes(data.status) ? "paid" : data.status });
  } catch (err) {
    console.error("order-status failed", err?.message || err);
    return respond(502, { error: "Could not check the order." });
  }
};
