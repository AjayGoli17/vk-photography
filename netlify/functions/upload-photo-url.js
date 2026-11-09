/* ============================================================
   POST /.netlify/functions/upload-photo-url
   Body: { orderRef, itemId, contentType }
   Returns a short-lived signed upload URL so the browser can send the
   customer's photo straight to the PRIVATE order-photos bucket (photos
   can be up to 10 MB, more than a Netlify Function request can carry).
   ============================================================ */
"use strict";

const { db, respond, PHOTO_BUCKET } = require("./_lib/db");

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const ID_RE = /^[A-Za-z0-9_-]{1,60}$/;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Invalid request body." }); }

  const { orderRef, itemId, contentType } = body;
  if (typeof orderRef !== "string" || !ID_RE.test(orderRef)) return respond(400, { error: "Invalid order reference." });
  if (typeof itemId !== "string" || !ID_RE.test(itemId)) return respond(400, { error: "Invalid item id." });
  const ext = EXT[contentType];
  if (!ext) return respond(400, { error: "Please upload a JPG, PNG or WEBP image." });

  const path = `${orderRef}/${itemId}.${ext}`;
  try {
    const { data, error } = await db().storage.from(PHOTO_BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error) throw error;
    return respond(200, { path, signedUrl: data.signedUrl, anonKey: process.env.SUPABASE_ANON_KEY || "" });
  } catch (err) {
    console.error("upload-photo-url failed", err?.message || err);
    return respond(500, { error: "Couldn't prepare the photo upload. Please try again." });
  }
};
