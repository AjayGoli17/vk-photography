/* ============================================================
   POST /.netlify/functions/upload-photo-url
   Body: { orderRef, itemId, contentType }
   Returns a short-lived signed upload URL so the browser can send the
   customer's photo straight to the PRIVATE order-photos bucket (photos
   can be up to 10 MB, more than a Netlify Function request can carry).
   ============================================================ */
"use strict";

const { db, respond, allowRequest, PHOTO_BUCKET } = require("./_lib/db");

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;
const ORDER_REF_RE = /^VK[A-HJ-NP-Z2-9]{6}$/;
const MAX_FILES_PER_ORDER = 20; // matches MAX_ITEMS_PER_ORDER

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });
  if (String(event.body || "").length > 2000) return respond(413, { error: "Request too large." });
  if (!(await allowRequest(event, "upload-photo", 60, 600))) {
    return respond(429, { error: "Too many uploads. Please wait a few minutes and try again." });
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Invalid request body." }); }

  const { orderRef, itemId, contentType } = body;
  if (typeof orderRef !== "string" || !ORDER_REF_RE.test(orderRef)) return respond(400, { error: "Invalid order reference." });
  if (typeof itemId !== "string" || !ID_RE.test(itemId)) return respond(400, { error: "Invalid item id." });
  const ext = EXT[contentType];
  if (!ext) return respond(400, { error: "Please upload a JPG, PNG or WEBP image." });

  const path = `${orderRef}/${itemId}.${ext}`;
  try {
    const supabase = db();

    // Once an order has been paid (or is being fulfilled) its photos are frozen: otherwise anyone
    // who knew the order ref could overwrite the photo we are about to print.
    const { data: existing, error: exErr } = await supabase
      .from("orders").select("status").eq("order_ref", orderRef).maybeSingle();
    if (exErr) throw exErr;
    if (existing && !["awaiting_payment", "payment_failed"].includes(existing.status)) {
      return respond(409, { error: "This order can no longer be changed." });
    }

    // Cap how many files can be parked under one order ref.
    const { data: files, error: listErr } = await supabase.storage.from(PHOTO_BUCKET).list(orderRef, { limit: 100 });
    if (listErr) throw listErr;
    const names = (files || []).map((f) => f.name);
    if (names.length >= MAX_FILES_PER_ORDER && !names.includes(`${itemId}.${ext}`)) {
      return respond(400, { error: "Too many photos for one order." });
    }

    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error) throw error;
    return respond(200, { path, signedUrl: data.signedUrl, anonKey: process.env.SUPABASE_ANON_KEY || "" });
  } catch (err) {
    console.error("upload-photo-url failed", err?.message || err);
    return respond(500, { error: "Couldn't prepare the photo upload. Please try again." });
  }
};
