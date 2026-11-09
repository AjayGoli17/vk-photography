/* ============================================================
   POST /.netlify/functions/create-order
   1. Validates the customer + cart and prices it from js/shop-pricing.js
      (nothing the browser sends about prices is ever trusted).
   2. Saves the pending order + items to Supabase.
   3. Creates the Razorpay Order and stores its id on the saved order.

   The photos were already uploaded by the browser (see upload-photo-url);
   this function checks they actually exist before taking payment.
   ============================================================ */
"use strict";

const Razorpay = require("razorpay");
const {
  SHIPPING_FEE, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER, SIZES, getItemUnitPrice,
} = require("../../js/shop-pricing.js");
const { db, respond, PHOTO_BUCKET } = require("./_lib/db");

const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Invalid request body." }); }

  const { orderRef, items, customer } = body;

  if (typeof orderRef !== "string" || !/^[A-Za-z0-9_-]{1,40}$/.test(orderRef)) {
    return respond(400, { error: "Invalid order reference." });
  }
  if (!Array.isArray(items) || items.length === 0) return respond(400, { error: "Your cart is empty." });
  if (items.length > MAX_ITEMS_PER_ORDER) return respond(400, { error: "Too many items in this order." });

  const cust = cleanCustomer(customer);
  if (!cust) return respond(400, { error: "Please check your delivery details." });

  // Price every line from the trusted catalog and build the rows to save.
  let subtotal = 0;
  const rows = [];
  for (const item of items) {
    const quantity = item && item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
      return respond(400, { error: "Invalid quantity in cart." });
    }
    const unitPrice = getItemUnitPrice(item);
    if (unitPrice == null) return respond(400, { error: "One of the items in your cart is no longer available." });

    if (typeof item.itemId !== "string" || !ID_RE.test(item.itemId)) return respond(400, { error: "Invalid item." });
    const photoPath = item.photoPath;
    if (typeof photoPath !== "string" || !new RegExp(`^${orderRef}/${item.itemId}\\.(jpg|png|webp)$`).test(photoPath)) {
      return respond(400, { error: "Your photo wasn't uploaded. Please try again." });
    }

    subtotal += unitPrice * quantity;
    const isGift = item.productId !== undefined;
    const size = isGift ? null : SIZES.find((s) => s.id === item.sizeId);
    rows.push({
      item_id: item.itemId,
      kind: isGift ? "gift" : "frame",
      product_id: isGift ? item.productId : null,
      frame_id: isGift ? null : item.frameId,
      size_id: isGift ? null : item.sizeId,
      size_label: size ? size.label : null,
      quality_id: isGift ? null : item.qualityId,
      mounting_id: isGift ? null : item.mountingId,
      orientation: isGift ? null : (item.orientation === "landscape" ? "landscape" : "portrait"),
      quantity,
      unit_price: unitPrice,
      photo_path: photoPath,
      photo_width: posInt(item.photoW),
      photo_height: posInt(item.photoH),
      crop: cleanCrop(item.crop),
    });
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

  try {
    const supabase = db();

    // Don't take a second payment for an order that's already paid.
    const { data: existing, error: exErr } = await supabase
      .from("orders").select("id, status").eq("order_ref", orderRef).maybeSingle();
    if (exErr) throw exErr;
    if (existing && !["awaiting_payment", "payment_failed"].includes(existing.status)) {
      return respond(409, { error: "This order has already been paid." });
    }

    // Make sure every photo really reached storage before charging.
    const { data: files, error: listErr } = await supabase.storage.from(PHOTO_BUCKET).list(orderRef, { limit: 100 });
    if (listErr) throw listErr;
    const present = new Set((files || []).map((f) => `${orderRef}/${f.name}`));
    if (!rows.every((r) => present.has(r.photo_path))) {
      return respond(400, { error: "Your photo wasn't uploaded. Please try again." });
    }

    // Save (or refresh, on a retry) the pending order.
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .upsert({
        order_ref: orderRef,
        status: "awaiting_payment",
        customer_name: cust.name, customer_phone: cust.phone, customer_email: cust.email,
        address: cust.address, city: cust.city, state: cust.state, pincode: cust.pincode,
        subtotal, shipping: SHIPPING_FEE, total,
      }, { onConflict: "order_ref" })
      .select("id").single();
    if (orderErr) throw orderErr;

    const { error: delErr } = await supabase.from("order_items").delete().eq("order_id", order.id);
    if (delErr) throw delErr;
    const { error: itemsErr } = await supabase.from("order_items").insert(rows.map((r) => ({ ...r, order_id: order.id })));
    if (itemsErr) throw itemsErr;

    // Create the Razorpay order and remember its id.
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: orderRef,
      notes: { orderRef, customerName: cust.name, customerEmail: cust.email, customerPhone: cust.phone },
    });

    const { error: updErr } = await supabase.from("orders").update({ razorpay_order_id: razorpayOrder.id }).eq("id", order.id);
    if (updErr) throw updErr;

    return respond(200, {
      keyId, // public key id, safe for the browser
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderRef,
    });
  } catch (err) {
    console.error("create-order failed", err?.message || err);
    return respond(502, { error: "Couldn't start the payment. Please try again." });
  }
};

function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function posInt(v) { return Number.isInteger(v) && v > 0 && v < 100000 ? v : null; }

function cleanCustomer(c) {
  if (!c || typeof c !== "object") return null;
  const out = {
    name: str(c.name, 120),
    phone: str(c.phone, 20),
    email: str(c.email, 160),
    address: str(c.address, 400),
    city: str(c.city, 80),
    state: str(c.state, 80),
    pincode: str(c.pincode, 6),
  };
  if (!out.name || !out.address || !out.city || !out.state) return null;
  if (!/^[0-9]{10}$/.test(out.phone.replace(/\D/g, "").slice(-10))) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) return null;
  if (!/^[1-9][0-9]{5}$/.test(out.pincode)) return null;
  return out;
}

function cleanCrop(c) {
  if (!c || typeof c !== "object") return null;
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    x: num(c.x), y: num(c.y), scale: num(c.scale),
    unit: c.unit === "fraction" ? "fraction" : "px",
    windowW: num(c.windowW), windowH: num(c.windowH),
  };
}
