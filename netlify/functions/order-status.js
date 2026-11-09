/* GET /.netlify/functions/order-status?orderRef=VKXXXXXX
   Lets the browser recover after a UPI app round-trip. Returns only the status. */
"use strict";
const { db, respond } = require("./_lib/db");

exports.handler = async (event) => {
  const orderRef = event.queryStringParameters && event.queryStringParameters.orderRef;
  if (!orderRef || !/^[A-Za-z0-9_-]{1,40}$/.test(orderRef)) return respond(400, { error: "Invalid order reference." });
  try {
    const { data, error } = await db().from("orders").select("status, razorpay_payment_id").eq("order_ref", orderRef).maybeSingle();
    if (error) throw error;
    if (!data) return respond(404, { status: "unknown" });
    return respond(200, { status: data.status === "paid" ? "paid" : data.status, razorpayPaymentId: data.razorpay_payment_id || null });
  } catch (err) {
    console.error("order-status failed", err?.message || err);
    return respond(502, { error: "Could not check the order." });
  }
};
