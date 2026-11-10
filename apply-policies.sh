#!/usr/bin/env bash
# Run from the repo root (the folder that contains index.html).
set -e
[ -f index.html ] && [ -f privacy.html ] || { echo "Run this inside your repo root (where index.html is)."; exit 1; }

UPDATED="10 November 2026"

page() {  # usage: page <file> <title-html> <description>   (page body comes from stdin)
  {
    cat <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$2 | VK Photography</title>
<meta name="description" content="$3">
<link rel="icon" href="favicon.jpg">
<style>
  body { margin: 0; background: #faf8f5; color: #2b2620; font: 16px/1.7 Georgia, "Times New Roman", serif; }
  main { max-width: 680px; margin: 0 auto; padding: 56px 22px 80px; }
  h1 { font-size: 2rem; margin: 0 0 4px; }
  h2 { font-size: 1.15rem; margin: 2rem 0 .4rem; }
  p, li { margin: .5rem 0; }
  a { color: #2b2620; }
  .meta { color: #6b6256; font-size: .9rem; }
  .legal-nav { margin-top: 3rem; padding-top: 1.2rem; border-top: 1px solid #e3ddd3; font-size: .95rem; }
  .legal-nav a { margin-right: 14px; }
</style>
</head>
<body>
<main>
  <p><a href="index.html">&larr; Back to VK Photography</a></p>
  <h1>$2</h1>
  <p class="meta">Last updated: $UPDATED</p>
EOF
    cat
    cat <<'EOF'

  <div class="legal-nav">
    <a href="privacy.html">Privacy Policy</a>
    <a href="terms.html">Terms of Service</a>
    <a href="refund-policy.html">Refund &amp; Cancellation</a>
    <a href="shipping-policy.html">Shipping &amp; Delivery</a>
  </div>
</main>
</body>
</html>
EOF
  } > "$1"
  echo "created $1"
}

biz() {
  cat <<'EOF'
  <p><strong>VK Photography</strong> (operating from VK Colour Lab Digital Photo Studio), Rampally, Hyderabad, Telangana, India.<br>
  Phone / WhatsApp: <a href="tel:+917207046157">+91 72070 46157</a> &middot; Email: <a href="mailto:vkphotography263@gmail.com">vkphotography263@gmail.com</a><br>
  Studio hours: Mon&ndash;Sat, 10:00 AM &ndash; 8:30 PM</p>
EOF
}

# ---------------- terms.html ----------------
{
cat <<'EOF'

  <p>These terms apply when you use the VK Photography website, request a quotation, book a photography session or order from our online shop. By using the site or placing an order you agree to them.</p>

  <h2>Who we are</h2>
EOF
biz
cat <<'EOF'

  <h2>Photography and video services</h2>
  <ul>
    <li>A quotation is an estimate. Your booking is confirmed only when we agree the date, services, price and any advance payment with you in writing (WhatsApp, email or in person).</li>
    <li>Advance amounts, rescheduling and cancellation terms for events are agreed at the time of booking and apply to that booking.</li>
    <li>We will make every reasonable effort to deliver the agreed photos and videos. Delivery timelines depend on the package and the volume of work, and we will tell you the expected date when you book.</li>
    <li>We may use photographs and short clips from your event in our portfolio and social media. Tell us before or at booking if you do not want this, and we will not use them.</li>
  </ul>

  <h2>Online shop (photoframes and photo gifts)</h2>
  <ul>
    <li>Prices are in Indian Rupees (INR). The price shown at checkout, including the shipping fee, is the price you pay. Prices may change, but never for an order you have already paid for.</li>
    <li>Every item is made specially from the photo you upload. Colours on screen may look slightly different from the final print because of screen settings and printing processes.</li>
    <li>Your order is confirmed once your payment is successful. We may cancel and refund an order if we cannot make it, for example because the photo is too low in resolution for the size chosen, or an item is unavailable.</li>
    <li>Cancellations, refunds and replacements are covered in our <a href="refund-policy.html">Refund &amp; Cancellation Policy</a>. Delivery is covered in our <a href="shipping-policy.html">Shipping &amp; Delivery Policy</a>.</li>
  </ul>

  <h2>Your photos</h2>
  <p>You confirm that you own the photos you upload or have permission to use and print them, and that they do not infringe anyone's rights or contain unlawful or abusive content. We may refuse to print any photo that breaks this rule. We use your photos only to make your order, as explained in our <a href="privacy.html">Privacy Policy</a>.</p>

  <h2>Payments</h2>
  <p>Online payments are processed by Razorpay using UPI, cards, netbanking or wallets. We never see or store your card, UPI PIN or bank details. If money is deducted but your order is not confirmed, it is normally returned to you automatically by your bank or Razorpay; contact us if it is not.</p>

  <h2>Our content</h2>
  <p>The photographs, videos, logo, design and text on this website belong to VK Photography unless stated otherwise. Please do not copy, republish or use them commercially without our written permission.</p>

  <h2>Limits of our responsibility</h2>
  <p>We take care to provide accurate information and good-quality products and services, but we cannot guarantee the site will always be available or free of errors. To the extent the law allows, our responsibility for any order is limited to the amount you paid for it. Nothing in these terms limits your rights under Indian consumer law.</p>

  <h2>Changes to these terms</h2>
  <p>We may update these terms from time to time. The version on this page, with its date, is the one that applies.</p>

  <h2>Governing law</h2>
  <p>These terms are governed by the laws of India. Any dispute will be subject to the courts at Hyderabad, Telangana.</p>

  <h2>Contact us</h2>
  <p>Questions about these terms? Write to <a href="mailto:vkphotography263@gmail.com">vkphotography263@gmail.com</a> or call <a href="tel:+917207046157">+91 72070 46157</a>.</p>
EOF
} | page terms.html "Terms of Service" "Terms of Service for VK Photography: photography bookings, the online shop, personalised products, payments and your responsibilities."

# ---------------- refund-policy.html ----------------
{
cat <<'EOF'

  <p>Our shop products are personalised and made specially from your photo, so they cannot be resold. Please check your photo, crop, size and frame carefully before paying. This policy explains when you can cancel, and what we do if something goes wrong.</p>

  <h2>Cancelling an order</h2>
  <ul>
    <li><strong>Before we start printing:</strong> you can cancel for a full refund. Contact us as soon as possible, ideally within 12 hours of ordering, by WhatsApp or phone with your order number.</li>
    <li><strong>After printing or framing has started:</strong> we cannot cancel or refund, because the product has been made for you.</li>
    <li>If an order has already been shipped, it cannot be cancelled.</li>
  </ul>

  <h2>Returns</h2>
  <p>Because every item is custom-made, we do not accept returns or exchanges for change of mind, or for differences caused by the photo you supplied (for example low resolution, blur, or your chosen crop).</p>

  <h2>Damaged, defective or wrong items</h2>
  <p>If your order arrives damaged, has a printing defect, or is not what you ordered, we will replace it free of charge or refund you, whichever you prefer. To make a claim:</p>
  <ul>
    <li>Contact us within <strong>48 hours of delivery</strong> on WhatsApp <a href="https://wa.me/917207046157">+91 72070 46157</a> or at <a href="mailto:vkphotography263@gmail.com">vkphotography263@gmail.com</a>.</li>
    <li>Send your order number and clear photos of the item and the packaging. A short unboxing video helps if you have one.</li>
    <li>We will review your claim and reply within 2 working days.</li>
  </ul>

  <h2>How refunds are paid</h2>
  <ul>
    <li>Approved refunds go back to the original payment method (UPI, card, netbanking or wallet).</li>
    <li>We start the refund within 3 working days of approval. It usually reaches your account in 5&ndash;7 working days, depending on your bank.</li>
    <li>The shipping fee is refunded only when we cancel the order, or when the problem is our fault.</li>
  </ul>

  <h2>Payment problems</h2>
  <p>If money was deducted but you did not get an order confirmation, wait a short while first. Payments that are not confirmed are normally reversed automatically within 5&ndash;7 working days. If yours is not, contact us with your payment reference and we will help.</p>

  <h2>Photography and video bookings</h2>
  <p>Advance payments and cancellation or rescheduling terms for events are agreed with you when the booking is confirmed, and apply to that booking.</p>

  <h2>Contact us</h2>
EOF
biz
} | page refund-policy.html "Refund &amp; Cancellation Policy" "Refund, cancellation and replacement policy for personalised photoframes and photo gifts from VK Photography."

# ---------------- shipping-policy.html ----------------
{
cat <<'EOF'

  <p>This policy covers delivery of products ordered from the VK Photography online shop.</p>

  <h2>Where we deliver</h2>
  <p>We deliver across India to any address that a courier can reach. We do not currently ship outside India.</p>

  <h2>Shipping fee</h2>
  <p>A flat shipping fee of <strong>&#8377;199</strong> is added to every order, however many items it contains. The fee is shown at checkout before you pay.</p>

  <h2>How long it takes</h2>
  <ul>
    <li><strong>Making your order:</strong> 3&ndash;5 working days after payment is confirmed, as each item is printed and prepared specially for you.</li>
    <li><strong>Courier delivery:</strong> usually 3&ndash;7 working days after dispatch, depending on your location.</li>
    <li><strong>Total:</strong> most orders arrive in about 6&ndash;12 working days from the date of payment.</li>
  </ul>
  <p>These are estimates, not guarantees. Festival seasons, weather, remote locations and courier delays can add time. If we expect a delay, we will let you know.</p>

  <h2>Tracking your order</h2>
  <p>When your order is dispatched we send you the courier name and tracking number by WhatsApp or email, using the phone number and email you gave at checkout. You can also contact us any time with your order number for an update.</p>

  <h2>Delivery address</h2>
  <p>Please check your address, pincode and phone number before paying. We are not responsible for delays or non-delivery caused by an incorrect or incomplete address. If a parcel comes back to us because of a wrong address, you may need to pay the shipping fee again for us to resend it.</p>

  <h2>Receiving your order</h2>
  <p>Please open the parcel soon after it arrives. If it is damaged or the wrong item, follow the steps in our <a href="refund-policy.html">Refund &amp; Cancellation Policy</a>, and contact us within 48 hours of delivery.</p>

  <h2>Contact us</h2>
EOF
biz
} | page shipping-policy.html "Shipping &amp; Delivery Policy" "Shipping and delivery policy for VK Photography photoframes and photo gifts: delivery areas, timelines and the shipping fee."

# ---------------- footer links on 6 pages ----------------
for f in index.html contact.html portfolio.html quotation.html service.html shop.html; do
  if grep -q '<a href="#">Terms of Service</a>' "$f"; then
    sed -i.bak 's|<a href="#">Terms of Service</a>|<a href="terms.html">Terms of Service</a><a href="refund-policy.html">Refund \&amp; Cancellation</a><a href="shipping-policy.html">Shipping \&amp; Delivery</a>|' "$f"
    rm -f "$f.bak"
    echo "footer updated: $f"
  else
    echo "footer already updated (or link not found): $f"
  fi
done

# ---------------- privacy page: links to the other legal pages ----------------
if ! grep -q 'legal-nav' privacy.html; then
  sed -i.bak 's|</main>|  <div class="legal-nav" style="margin-top:3rem;padding-top:1.2rem;border-top:1px solid #e3ddd3;font-size:.95rem"><a href="terms.html" style="margin-right:14px">Terms of Service</a><a href="refund-policy.html" style="margin-right:14px">Refund \&amp; Cancellation</a><a href="shipping-policy.html">Shipping \&amp; Delivery</a></div></main>|' privacy.html
  rm -f privacy.html.bak
  echo "privacy.html updated"
fi

# ---------------- footer links wrap on phones ----------------
if ! grep -q 'vk-footer-legal-wrap' css/style.css; then
  printf '\n/* vk-footer-legal-wrap: let the legal links wrap on small screens */\n.footer-legal{flex-wrap:wrap;gap:10px 26px}\n' >> css/style.css
  echo "css/style.css updated"
fi

echo; echo "Done. Review with:  git status"
