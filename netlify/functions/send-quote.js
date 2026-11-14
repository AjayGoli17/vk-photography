/* ============================================================
   POST /.netlify/functions/send-quote
   The browser used to call the Google Apps Script URL directly, so anyone could find that URL
   and send email through the studio's account. Now the browser calls this function, which
   validates everything, then forwards it to Apps Script with a secret the public never sees.

   Netlify env vars:
     APPS_SCRIPT_URL     the Web App /exec URL (falls back to the one the site used before)
     APPS_SCRIPT_SECRET  long random string, the same value as SHARED_SECRET in apps-script/Code.gs
   ============================================================ */
"use strict";

const { respond, allowRequest, allowGlobal, originAllowed, checkFormToken } = require("./_lib/db");

const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxuJuUjff-6oI631EXlCKCIRaCmJi3Pxf4xi_YO8_QeaEPzDC-geTa-BQrbkkimqb_Y/exec";

const text = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const oneLine = (v, max) => text(v, max).replace(/\s+/g, " ");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { status: "error", message: "Method not allowed." });
  if (!originAllowed(event)) return respond(403, { status: "error", message: "Request not allowed." });
  if (String(event.body || "").length > 2500000) return respond(413, { status: "error", message: "Request too large." });
  if (!(await allowRequest(event, "send-quote", 5, 600))) return respond(429, { status: "error", message: "Too many requests. Please try again in a few minutes." });
  if (!(await allowGlobal("send-quote", 80, 3600))) return respond(429, { status: "error", message: "Busy right now. Please call or WhatsApp us." });

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return respond(400, { status: "error", message: "Invalid request." }); }

  let tokenState;
  try { tokenState = checkFormToken(b.formToken); } catch (err) {
    console.error("send-quote: token check unavailable", err?.message || err);
    return respond(500, { status: "error", message: "Unavailable." });
  }
  if (tokenState !== "ok") return respond(400, { status: "error", message: "Please wait a moment and try again.", code: tokenState });

  const customer_name = oneLine(b.customer_name, 120);
  const customer_email = oneLine(b.customer_email, 160);
  const file_name = oneLine(b.file_name, 100);
  const pdf = typeof b.pdf_base64 === "string" ? b.pdf_base64 : "";
  if (!customer_name) return respond(400, { status: "error", message: "Missing name." });
  if (customer_email && customer_email !== "N/A" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) return respond(400, { status: "error", message: "Invalid email." });
  if (!/^[A-Za-z0-9._-]{1,100}\.pdf$/.test(file_name)) return respond(400, { status: "error", message: "Invalid file name." });
  // Must be a real (small) PDF: base64 of "%PDF-" always starts with "JVBERi0".
  if (!pdf || pdf.length > 2000000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(pdf) || !pdf.startsWith("JVBERi0")) {
    return respond(400, { status: "error", message: "Invalid quote file." });
  }

  const payload = {
    customer_name,
    customer_phone: oneLine(b.customer_phone, 30),
    customer_email,
    event_category: oneLine(b.event_category, 300),
    event_date: oneLine(b.event_date, 40),
    event_location: oneLine(b.event_location, 200),
    event_guests: oneLine(String(b.event_guests == null ? "" : b.event_guests), 20),
    estimated_total: oneLine(b.estimated_total, 30),
    special_requirements: text(b.special_requirements, 2000),
    pdf_base64: pdf,
    file_name,
    secret: process.env.APPS_SCRIPT_SECRET || "",
  };

  try {
    const res = await fetch(process.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    const raw = await res.text();
    let json = null;
    try { json = JSON.parse(raw); } catch { /* not JSON */ }
    if (json && json.status === "success") return respond(200, { status: "success" });
    console.error("send-quote: Apps Script refused", res.status, raw.slice(0, 200));
  } catch (err) {
    console.error("send-quote: Apps Script call failed", err?.message || err);
  }
  return respond(502, { status: "error", message: "Could not send the quote email." });
};
