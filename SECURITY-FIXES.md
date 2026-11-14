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
