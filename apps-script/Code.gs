/**
 * VK Photography: quote e-mail endpoint (Google Apps Script Web App)
 *
 * HOW TO INSTALL (5 minutes):
 *  1. Open your existing Apps Script project, replace ALL the code with this file.
 *  2. Set STUDIO_EMAIL and SHARED_SECRET below. SHARED_SECRET must be the SAME value you put in
 *     Netlify as APPS_SCRIPT_SECRET. Make it long and random (e.g. run:  openssl rand -hex 24 ).
 *  3. Deploy > Manage deployments > pencil icon > Version: "New version" > Deploy.
 *     (Keeping the same deployment keeps the same /exec URL.)
 *  4. Deploy settings must be: Execute as "Me", Who has access "Anyone".
 *
 * What it enforces: requests without the secret are rejected, the PDF is size/type checked,
 * mail only goes to the studio (the customer is set as Reply-To), and at most MAX_PER_DAY a day.
 */
const STUDIO_EMAIL = 'REPLACE_WITH_STUDIO_EMAIL@example.com';
const SHARED_SECRET = 'REPLACE_WITH_A_LONG_RANDOM_STRING';
const SEND_COPY_TO_CUSTOMER = false;   // true = also e-mail the PDF to the customer's address
const MAX_PER_DAY = 60;
const MAX_PDF_BYTES = 1500000;

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents || e.postData.contents.length > 2500000) return out_('error', 'Bad request');
    const d = JSON.parse(e.postData.contents);
    if (!SHARED_SECRET || SHARED_SECRET.indexOf('REPLACE_') === 0 || d.secret !== SHARED_SECRET) return out_('error', 'Unauthorized');

    const name = clean_(d.customer_name, 120);
    const email = clean_(d.customer_email, 160);
    const fileName = String(d.file_name || '');
    if (!name || !/^[A-Za-z0-9._-]{1,100}\.pdf$/.test(fileName)) return out_('error', 'Invalid data');

    // Daily cap, so a leaked secret can't burn the mail quota.
    const props = PropertiesService.getScriptProperties();
    const day = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd');
    const used = props.getProperty('sent_' + day) ? parseInt(props.getProperty('sent_' + day), 10) : 0;
    if (used >= MAX_PER_DAY) return out_('error', 'Daily limit reached');

    const bytes = Utilities.base64Decode(String(d.pdf_base64 || ''));
    if (bytes.length > MAX_PDF_BYTES || bytes.length < 100 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) return out_('error', 'Invalid PDF');
    const pdf = Utilities.newBlob(bytes, 'application/pdf', fileName);

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const body =
      'New quote request\n\n' +
      'Name: ' + name + '\n' +
      'Phone: ' + clean_(d.customer_phone, 30) + '\n' +
      'Email: ' + email + '\n' +
      'Event: ' + clean_(d.event_category, 300) + '\n' +
      'Date: ' + clean_(d.event_date, 40) + '\n' +
      'Location: ' + clean_(d.event_location, 200) + '\n' +
      'Guests: ' + clean_(d.event_guests, 20) + '\n' +
      'Estimated total: ' + clean_(d.estimated_total, 30) + '\n\n' +
      'Requirements:\n' + String(d.special_requirements || 'None').slice(0, 2000) + '\n';

    const opts = { to: STUDIO_EMAIL, subject: 'New quote request: ' + name, body: body, attachments: [pdf], name: 'VK Photography website' };
    if (validEmail) opts.replyTo = email;
    MailApp.sendEmail(opts);

    if (SEND_COPY_TO_CUSTOMER && validEmail) {
      MailApp.sendEmail({ to: email, subject: 'Your VK Photography quotation', body: 'Hi ' + name + ',\n\nThank you for your enquiry. Your quotation is attached.\n\nVK Photography', attachments: [pdf], name: 'VK Photography' });
    }
    props.setProperty('sent_' + day, String(used + 1));
    return out_('success', '');
  } catch (err) {
    return out_('error', 'Server error');
  }
}

function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max); }
function out_(status, message) {
  return ContentService.createTextOutput(JSON.stringify({ status: status, message: message })).setMimeType(ContentService.MimeType.JSON);
}
