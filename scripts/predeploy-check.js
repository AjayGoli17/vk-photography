/* Runs on every Netlify build (see netlify.toml). Fails the build if the site folder is wrong,
   and, once you switch REQUIRE_LIVE_KEYS=true in Netlify, if production would go live with
   missing settings or Razorpay TEST keys. Until then problems are printed as warnings. */
"use strict";
const fs = require("fs");
const ctx = process.env.CONTEXT || "local";
const strict = process.env.REQUIRE_LIVE_KEYS === "true";
let failed = false;
const warn = (m) => console.warn("⚠️  " + m);
const bad = (m) => { console.error("❌ " + m); failed = true; };
const issue = (m) => (strict ? bad(m) : warn(m));

if (!fs.existsSync("public/index.html")) bad("public/index.html is missing: the website must live in the public/ folder.");

if (ctx === "production") {
  const need = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) issue("Missing environment variables: " + missing.join(", "));

  const key = process.env.RAZORPAY_KEY_ID || "";
  if (key.startsWith("rzp_test_")) issue("Razorpay is using TEST keys (rzp_test_). Customers' payments will not be real. Switch to live keys before launch.");
  else if (key && !key.startsWith("rzp_live_")) warn("RAZORPAY_KEY_ID does not look like a live key (rzp_live_...).");

  ["FORM_TOKEN_SECRET", "APPS_SCRIPT_SECRET", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"].forEach((k) => {
    if (!process.env[k]) warn(k + " is not set.");
  });
  if (!strict) warn("REQUIRE_LIVE_KEYS is not 'true'. Set it in Netlify at go-live so test keys / missing settings block the deploy.");
}
process.exit(failed ? 1 : 0);
