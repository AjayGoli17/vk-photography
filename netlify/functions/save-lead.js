/* ============================================================
   POST /.netlify/functions/save-lead
   Saves a quotation or contact-form enquiry to the leads table and
   sends a Telegram alert. The email PDF (Apps Script) and the WhatsApp
   redirect keep working exactly as before; this only adds a saved record.
   ============================================================ */
"use strict";

const { db, respond, notifyTelegram, allowRequest, oneLine } = require("./_lib/db");

function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
const orNull = (s) => (s ? s : null);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });
  if (String(event.body || "").length > 60000) return respond(413, { error: "Request too large." });
  // Public form: cap submissions per visitor so it can't be used to flood the database or Telegram.
  if (!(await allowRequest(event, "save-lead", 8, 600))) {
    return respond(429, { error: "Too many requests. Please try again in a few minutes." });
  }

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Invalid request body." }); }

  const source = b.source === "quotation" || b.source === "contact" ? b.source : null;
  const name = str(b.name, 120);
  const phone = str(b.phone, 30);
  if (!source || !name) return respond(400, { error: "Missing details." });
  if (source === "contact" && !phone) return respond(400, { error: "Missing phone." });

  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(str(b.eventDate, 10)) ? str(b.eventDate, 10) : null;
  const guests = Number.isInteger(+b.guests) && +b.guests > 0 && +b.guests < 100000 ? +b.guests : null;
  const estimatedTotal = Number.isFinite(+b.estimatedTotal) && +b.estimatedTotal >= 0 ? Math.round(+b.estimatedTotal) : null;

  let details = null;
  try { const s = JSON.stringify(b.details || null); if (s && s.length <= 20000) details = JSON.parse(s); } catch { /* ignore */ }

  const row = {
    source, name,
    phone: orNull(phone === "N/A" ? "" : phone),
    email: orNull(str(b.email, 160) === "N/A" ? "" : str(b.email, 160)),
    service: orNull(str(b.service, 200)),
    event_date: eventDate,
    location: orNull(str(b.location, 200)),
    guests,
    estimated_total: estimatedTotal,
    message: orNull(str(b.message, 2000)),
    details,
  };

  try {
    const { error } = await db().from("leads").insert(row);
    if (error) throw error;
  } catch (err) {
    console.error("save-lead failed", err?.message || err);
    return respond(500, { error: "Could not save your request." });
  }

  // Visitor-supplied text is flattened to one line so it can't forge extra alert lines.
  await notifyTelegram(
    `New ${source === "quotation" ? "quote request" : "booking enquiry"}\n` +
    `${oneLine(row.name)}${row.phone ? " · " + oneLine(row.phone, 30) : ""}\n` +
    `${oneLine(row.service || "", 100)}${row.event_date ? " · " + row.event_date : ""}${row.location ? " · " + oneLine(row.location, 100) : ""}` +
    (row.estimated_total != null ? `\nEstimate ₹${row.estimated_total}` : "")
  );

  return respond(200, { saved: true });
};
