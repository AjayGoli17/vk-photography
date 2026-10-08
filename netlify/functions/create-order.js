/* ============================================================
   POST /.netlify/functions/create-order
   Creates a Razorpay Order for the customer's cart.

   Security:
   - The final amount is always derived from js/shop-pricing.js on
     the server. Nothing supplied by the browser (unit prices,
     totals) is ever trusted.
   - RAZORPAY_KEY_SECRET is only used here, server-side, and is
     never returned in the response.
   ============================================================ */
"use strict";

const Razorpay = require("razorpay");
const { SHIPPING_FEE, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER, getItemUnitPrice } = require("../../js/shop-pricing.js");

const JSON_HEADERS = { "Content-Type": "application/json" };

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid request body." });
  }

  const { orderRef, items, customer } = body;

  if (typeof orderRef !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(orderRef)) {
    return respond(400, { error: "Invalid order reference." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return respond(400, { error: "Your cart is empty." });
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    return respond(400, { error: "Too many items in this order." });
  }

  // Validate every line item against the trusted product catalog and
  // compute the total ourselves — the client only tells us *which*
  // product / options were chosen, never what they cost. A line is
  // either a photo gift ({ productId, quantity }) or a photoframe
  // ({ sizeId, frameId, finishId, matId, quantity }).
  let subtotal = 0;
  for (const item of items) {
    const { quantity } = item || {};
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
      return respond(400, { error: "Invalid quantity in cart." });
    }

    const unitPrice = getItemUnitPrice(item);
    if (unitPrice == null) {
      return respond(400, { error: "One of the items in your cart is no longer available." });
    }
    subtotal += unitPrice * quantity;
  }

  const total = subtotal + SHIPPING_FEE;
  const amountInPaise = Math.round(total * 100);

  if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
    return respond(400, { error: "Could not calculate a valid order amount." });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    console.error("create-order: missing RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET env vars");
    return respond(500, { error: "Payments are temporarily unavailable. Please try again shortly." });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: orderRef,
      notes: {
        orderRef,
        customerName: safeNote(customer?.name),
        customerEmail: safeNote(customer?.email),
        customerPhone: safeNote(customer?.phone),
      },
    });

    return respond(200, {
      keyId, // public key id — safe for the browser
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderRef,
    });
  } catch (err) {
    console.error("create-order: Razorpay order creation failed", err?.message || err);
    return respond(502, { error: "Couldn't start the payment. Please try again." });
  }
};

function safeNote(value) {
  if (typeof value !== "string") return "";
  return value.slice(0, 200);
}

function respond(statusCode, body) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
