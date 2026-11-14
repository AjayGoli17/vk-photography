/* ============================================================
   POST /.netlify/functions/create-order
   1. Validates the customer + cart and prices it from public/js/shop-pricing.js
      (nothing the browser sends about prices is ever trusted).
   2. Confirms the caller owns the order ref (secret orderToken), saves the pending order + items.
   3. Re-uses the customer's existing Razorpay order on a retry (same amount), otherwise creates a
      new one and records it, so a payment on ANY earlier attempt still matches this order.
   ============================================================ */
"use strict";

const crypto = require("crypto");
const Razorpay = require("razorpay");
const {
  SHIPPING_FEE, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER, SIZES, getItemUnitPrice,
} = require("../../public/js/shop-pricing.js");
const { db, respond, allowRequest, claimOrderRef, PHOTO_BUCKET } = require("./_lib/db");

const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const ORDER_REF_RE = /^VK[A-HJ-NP-Z2-9]{6}$/;
const TOKEN_RE = /^[A-Za-z0-9]{32,64}$/;
const OPEN = ["awaiting_payment", "payment_failed"];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });
  if (String(event.body || "").length > 100000) return respond(413, { error: "Request too large." });
  if (!(await allowRequest(event, "create-order", 15, 600))) {
    return respond(429, { error: "Too many attempts. Please wait a few minutes and try again." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Invalid request body." }); }

  const { orderRef, items, customer, orderToken } = body;
  if (typeof orderToken !== "string" || !TOKEN_RE.test(orderToken)) {
    return respond(400, { error: "Invalid request. Please refresh the page and try again." });
  }
  const tokenHash = crypto.createHash("sha256").update(orderToken).digest("hex");

  if (typeof orderRef !== "string" || !ORDER_REF_RE.test(orderRef)) return respond(400, { error: "Invalid order reference." });
  if (!Array.isArray(items) || items.length === 0) return respond(400, { error: "Your cart is empty." });
  if (items.length > MAX_ITEMS_PER_ORDER) return respond(400, { error: "Too many items in this order." });

  const cust = cleanCustomer(customer);
  if (!cust) return respond(400, { error: "Please check your delivery details." });

  // Price every line from the trusted catalog and build the rows to save.
  let subtotal = 0;
  const rows = [];
  const seenItemIds = new Set();
  for (const item of items) {
    const quantity = item && item.quantity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
      return respond(400, { error: "Invalid quantity in cart." });
    }
    const unitPrice = getItemUnitPrice(item);
    if (unitPrice == null) return respond(400, { error: "One of the items in your cart is no longer available." });

    if (typeof item.itemId !== "string" || !ID_RE.test(item.itemId) || seenItemIds.has(item.itemId)) return respond(400, { error: "Invalid item." });
    seenItemIds.add(item.itemId);
    const photoPath = item.photoPath;
    if (typeof photoPath !== "string" || photoPath.length > 200 || !new RegExp(`^${orderRef}/${item.itemId}\\.(jpg|png|webp)$`).test(photoPath)) {
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
  // Go-live safety switch: set REQUIRE_LIVE_KEYS=true in Netlify and test keys can never take an order.
  if (process.env.REQUIRE_LIVE_KEYS === "true" && keyId.startsWith("rzp_test_")) {
    console.error("create-order: REQUIRE_LIVE_KEYS is on but RAZORPAY_KEY_ID is a TEST key");
    return respond(503, { error: "Online payments are not switched on yet. Please contact the studio." });
  }

  try {
    const supabase = db();

    // Only the browser that owns this order ref may touch it.
    if (!(await claimOrderRef(orderRef, orderToken))) {
      return respond(403, { error: "This order reference is already in use. Please refresh and try again." });
    }

    const { data: existing, error: exErr } = await supabase
      .from("orders").select("id, status, total, razorpay_order_id").eq("order_ref", orderRef).maybeSingle();
    if (exErr) throw exErr;
    if (existing && !OPEN.includes(existing.status)) {
      return respond(409, { error: "This order has already been paid." });
    }

    // Make sure every photo really reached storage before charging.
    const { data: files, error: listErr } = await supabase.storage.from(PHOTO_BUCKET).list(orderRef, { limit: 100 });
    if (listErr) throw listErr;
    const present = new Set((files || []).map((f) => `${orderRef}/${f.name}`));
    if (!rows.every((r) => present.has(r.photo_path))) {
      return respond(400, { error: "Your photo wasn't uploaded. Please try again." });
    }

    // Save (or refresh, on a retry) the pending order. The update only succeeds while the order is
    // still unpaid, so a payment that lands in the meantime can never be reset to "awaiting".
    const fields = {
      status: "awaiting_payment",
      customer_name: cust.name, customer_phone: cust.phone, customer_email: cust.email,
      address: cust.address, city: cust.city, state: cust.state, pincode: cust.pincode,
      subtotal, shipping: SHIPPING_FEE, total, token_hash: tokenHash,
    };
    let orderId;
    if (existing) {
      const { data: upd, error: updErr } = await supabase.from("orders").update(fields).eq("id", existing.id).in("status", OPEN).select("id");
      if (updErr) throw updErr;
      if (!upd || upd.length === 0) return respond(409, { error: "This order has already been paid." });
      orderId = existing.id;
    } else {
      const { data: ins, error: insErr } = await supabase.from("orders").insert({ order_ref: orderRef, ...fields }).select("id").single();
      if (insErr) throw insErr;
      orderId = ins.id;
    }

    const { error: delErr } = await supabase.from("order_items").delete().eq("order_id", orderId);
    if (delErr) throw delErr;
    const { error: itemsErr } = await supabase.from("order_items").insert(rows.map((r) => ({ ...r, order_id: orderId })));
    if (itemsErr) throw itemsErr;

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // Retry with the same amount: hand back the Razorpay order the customer already has, so a
    // payment still in flight on it (slow UPI) can't be orphaned by a second order.
    if (existing && existing.razorpay_order_id && existing.total === total) {
      try {
        const prev = await razorpay.orders.fetch(existing.razorpay_order_id);
        if (prev && prev.amount === amountInPaise && prev.status !== "paid") {
          return respond(200, { keyId, razorpayOrderId: prev.id, amount: prev.amount, currency: prev.currency, orderRef });
        }
      } catch (err) {
        console.warn("create-order: could not reuse the previous Razorpay order", err?.message || err);
      }
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: orderRef,
      notes: { orderRef, customerName: cust.name, customerEmail: cust.email, customerPhone: cust.phone },
    });

    const { error: rzpErr } = await supabase.from("orders").update({ razorpay_order_id: razorpayOrder.id }).eq("id", orderId);
    if (rzpErr) throw rzpErr;
    // Remember every Razorpay order made for this order (non-fatal if the round-2 migration is missing).
    const { error: linkErr } = await supabase.from("razorpay_order_links").upsert({ razorpay_order_id: razorpayOrder.id, order_id: orderId }, { onConflict: "razorpay_order_id", ignoreDuplicates: true });
    if (linkErr) console.error("create-order: could not record Razorpay order link (run the round-2 migration)", linkErr.message);

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
