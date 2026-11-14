/* ============================================================
   POST /.netlify/functions/save-lead
   Saves a quotation or contact-form enquiry to the leads table and sends a Telegram alert.
   Anti-spam layers: allowed origin, signed form token (min age), hidden honeypot field,
   per-IP and global rate limits, and duplicate suppression.
   ============================================================ */
"use strict";

const { db, respond, notifyTelegram, allowRequest, allowGlobal, oneLine, originAllowed, checkFormToken } = require("./_lib/db");

function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
const orNull = (s) => (s ? s : null);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { error: "Method not allowed." });
  if (!originAllowed(event)) return respond(403, { error: "Request not allowed." });
  if (String(event.body || "").length > 60000) return respond(413, { error: "Request too large." });
  if (!(await allowRequest(event, "save-lead", 8, 600))) {
    return respond(429, { error: "Too many requests. Please try again in a few minutes." });
  }
  // Shared cap across all visitors, so rotating IP addresses can't flood the database or Telegram.
  if (!(await allowGlobal("save-lead", 150, 3600))) {
    return respond(429, { error: "We are receiving a lot of requests. Please call or WhatsApp us instead." });
  }

  let b;
  try { b = JSON.parse(event.body || "{}"); } catch { return respond(400, { error: "Invalid request body." }); }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots don't adapt.
  if (str(b.website, 200)) return respond(200, { saved: true });

  let tokenState;
  try { tokenState = checkFormToken(b.formToken); } catch (err) {
    console.error("save-lead: token check unavailable", err?.message || err);
    return respond(500, { error: "Could not save your request." });
  }
  if (tokenState !== "ok") {
    return respond(400, { error: "Please wait a moment and try again.", code: tokenState });
  }

  const source = b.source === "quotation" || b.source === "contact" ? b.source : null;
  const name = str(b.name, 120);
  const phone = str(b.phone, 30);
  if (!source || !name) return respond(400, { error: "Missing details." });
  // Every lead must be reachable: a real phone number, and (for quotes) a real email as well.
  const phoneDigits = phone.replace(/[\s\-().]/g, "");
  if (!/^(?:(?:\+?91|0)?[6-9]\d{9}|\+\d{8,15})$/.test(phoneDigits)) return respond(400, { error: "A valid phone number is required." });
  const emailIn = str(b.email, 160);
  if (source === "quotation" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailIn)) return respond(400, { error: "A valid email address is required." });

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
    const supabase = db();

    // Same person submitting twice within 10 minutes (double tap, retry): keep one record, one alert.
    const [col, val] = row.phone ? ["phone", row.phone] : row.email ? ["email", row.email] : ["name", row.name];
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: dup, error: dupErr } = await supabase.from("leads").select("id").eq("source", source).eq(col, val).gte("created_at", since).limit(1);
    if (dupErr) throw dupErr;
    if (dup && dup.length) return respond(200, { saved: true, duplicate: true });

    const { error } = await supabase.from("leads").insert(row);
    if (error) throw error;
  } catch (err) {
    console.error("save-lead failed", err?.message || err);
    return respond(500, { error: "Could not save your request." });
  }

  await notifyTelegram(
    `New ${source === "quotation" ? "quote request" : "booking enquiry"}\n` +
    `${oneLine(row.name)}${row.phone ? " · " + oneLine(row.phone, 30) : ""}\n` +
    `${oneLine(row.service || "", 100)}${row.event_date ? " · " + row.event_date : ""}${row.location ? " · " + oneLine(row.location, 100) : ""}` +
    (row.estimated_total != null ? `\nEstimate ₹${row.estimated_total}` : "")
  );

  return respond(200, { saved: true });
};
