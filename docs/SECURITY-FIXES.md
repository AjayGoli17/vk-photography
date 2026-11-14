# Security fixes

## Do these once after deploying
1. **Run the new migration** `supabase/migrations/20261114000001_security_hardening.sql` (Supabase SQL editor or `supabase db push`). The functions call `check_rate_limit()`; until it exists they fail open (rate limiting is simply off).
2. **Supabase dashboard > Authentication > Providers > Email:** turn OFF "Allow new users to sign up" (only you need to log in), and enable leaked-password protection.
3. **Test one payment end to end** (Razorpay test mode) after deploying: the new Content-Security-Policy in `netlify.toml` is the one change that could block a third-party script if Razorpay changes hosts.
4. **Google Apps Script** (quote e-mail endpoint, not in this repo): make sure it validates input, limits recipients (send only to your own address / the form's address) and caps request size. Its URL is public in `js/quotation.js`.
5. Run `npm ci` so the patched dependency versions in `package-lock.json` are installed.

## What changed
| Area | Problem | Fix |
|---|---|---|
| Payments | A payment was marked "paid" without checking the amount against the saved order | `markOrderPaid` now checks Razorpay's paid amount, currency and the saved line items; mismatches stay unpaid and send you a Telegram alert |
| Photos | Anyone who knew an order ref could overwrite a paid order's photo | Uploads refused once an order is no longer awaiting payment; max 20 files per order |
| Order refs | Any 1-40 char ref accepted | Must match the shop's `VK` + 6 chars format |
| order-status | Returned the Razorpay payment id to anyone with a ref | Returns only a coarse status |
| Abuse | No rate limits on public endpoints | DB-backed rate limits on all public functions |
| Telegram | Visitor text could forge extra alert lines | Text flattened to one line |
| Webhook log | Stored full payloads (email/phone) | Stores only order id, payment id, amount, status |
| Site files | `publish = "."` exposed `netlify/`, `supabase/`, `package.json`, `.env*` | Blocked with forced 404 redirects |
| Headers | No CSP/HSTS/frame/referrer protection | Added in `netlify.toml`; admin gets a strict no-inline-script CSP |
| Admin XSS | Several fields put in `innerHTML` unescaped; inline script | All escaped; script moved to `js/admin.js`; CSV export also guards tab/CR |
| Public XSS | Quote summary, cart/confirmation, portfolio built HTML from untrusted text | `textContent` / escaping; photo URLs limited to `data:`/`blob:` |
| Third-party JS | supabase-js and jsPDF loaded from CDNs without integrity checks | Self-hosted in `js/vendor/` (supabase-js now 2.119.0) |
| Dependencies | 4 vulnerabilities (axios, follow-redirects) | `package-lock.json` updated, `npm audit` reports 0 |
| DB | Mutable function search_path; `is_admin` callable by anon | Fixed in the migration; added a totals consistency check |

## Not fixable in code
- Unpaid order photos stay in storage forever; add a scheduled cleanup if storage cost matters.
- `script-src` still allows `'unsafe-inline'` on public pages because they use inline scripts and `onmouseover` handlers. Moving those to files would let you drop it.
- Longer term, publish only a `public/` folder instead of the repo root.

---
# Round 2 (client handover)

| # | Problem | Fix |
|---|---|---|
| 1 | Retrying checkout created a second Razorpay order; a payment on the first one looked "unknown" | `create-order` re-uses the open Razorpay order (same amount) and records every Razorpay order id in `razorpay_order_links`; `markOrderPaid` finds the order through any of them. A paid order can no longer be reset to "awaiting" by a late retry. |
| 2 | Photo upload / order status protected only by a short order code | The browser's secret `orderToken` now owns the order ref from the first upload (`order_claims`). `upload-photo-url`, `create-order` and `order-status` all require it. A wrong ref and a wrong token look identical (404). |
| 3 | No spam protection on forms | Signed form token with minimum age (`form-token`), hidden honeypot field, allowed-origin check, per-IP + shared global rate limits, duplicate suppression (one lead + one Telegram alert per person per 10 min). |
| 4 | Public Google Apps Script URL could send mail as the studio | The browser now calls `send-quote`, which validates everything and forwards to Apps Script with a secret. `apps-script/Code.gs` rejects calls without the secret, checks the PDF, mails only the studio, and caps sends per day. The URL is gone from the browser code and the CSP. |
| 5 | Admin: password only, no idle logout | Auto sign-out after 20 idle minutes; admin page no longer carries SEO/OG tags; `scripts/lock-supabase-signup.sh` turns off public sign-ups via the Supabase API. (Enable MFA in the Supabase dashboard too.) |
| 6 | Internal files served from the site root | The site now lives in `public/` and `netlify.toml` publishes only that. Docs, SQL, scripts and function source are not reachable by URL. CSP no longer allows images from any host. |
| 7 | Silent lead loss, WhatsApp blocked by pop-up blockers | WhatsApp opens inside the tap; the save is awaited with timeout + one retry; the visitor sees an honest result message with a fallback "Open WhatsApp" link. Quote: email and saved record go together; error screen only if both fail. |
| 8 | Test keys could go live | `REQUIRE_LIVE_KEYS=true` makes `create-order` refuse test keys and makes a production build fail on test keys / missing settings (`scripts/predeploy-check.js`). |

## Do these after deploying
1. Run `supabase/migrations/20261115000001_security_round2.sql` in the Supabase SQL editor.
2. Netlify env vars: `FORM_TOKEN_SECRET`, `APPS_SCRIPT_SECRET`, (optional `APPS_SCRIPT_URL`), live `RAZORPAY_*` keys, then `REQUIRE_LIVE_KEYS=true`.
3. Paste `apps-script/Code.gs` into the Apps Script project, set the two constants, Deploy > New version.
4. Turn off sign-ups in Supabase (Authentication > Sign In / Providers) or run `scripts/lock-supabase-signup.sh`.
5. Razorpay: live webhook to `https://vkphotography.studio/.netlify/functions/webhook` (events `payment.captured`, `payment.failed`).
6. Place one real small payment, one contact enquiry and one quote request.
