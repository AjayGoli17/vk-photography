/* GET /.netlify/functions/form-token
   Hands the page a signed timestamp. save-lead and send-quote refuse submissions that don't
   carry one, or that arrive less than 3 seconds after it was issued (a human can't do that). */
"use strict";
const { respond, allowRequest, signFormToken } = require("./_lib/db");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return respond(405, { error: "Method not allowed." });
  if (!(await allowRequest(event, "form-token", 40, 600))) return respond(429, { error: "Too many requests." });
  try {
    return respond(200, { token: signFormToken() });
  } catch (err) {
    console.error("form-token failed", err?.message || err);
    return respond(500, { error: "Unavailable." });
  }
};
