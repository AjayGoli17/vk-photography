document.addEventListener('DOMContentLoaded', () => {
    
    // Set Dynamic Year in Footer
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.reveal, .reveal-scale, .social-row').forEach((el, index) => {
        el.style.transitionDelay = `${(index % 6) * 0.08}s`;
        observer.observe(el);
    });

    const bookingForm = document.getElementById('bookingForm');
    const submitButton = bookingForm.querySelector('.submit-button');
    const whatsappNumber = '917207046157';

    const statusEl = document.getElementById('formStatus');
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
        const t = new Date();
        t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
        dateInput.min = t.toISOString().slice(0, 10);   // no dates in the past
    }

    function showStatus(message, isError, linkUrl) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle('is-error', !!isError);
        if (linkUrl) {
            statusEl.appendChild(document.createTextNode(' '));
            const a = document.createElement('a');
            a.href = linkUrl; a.target = '_blank'; a.rel = 'noopener';
            a.textContent = 'Open WhatsApp';
            statusEl.appendChild(a);
        }
        statusEl.hidden = false;
    }

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!bookingForm.checkValidity()) {
            bookingForm.reportValidity();
            return;
        }

        const name = document.getElementById('name').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const service = document.getElementById('service').value;
        const eventDate = document.getElementById('event-date').value;
        const location = document.getElementById('location').value.trim();
        const message = document.getElementById('message').value.trim();
        const honeypot = (bookingForm.elements['website'] || {}).value || '';

        const formattedDate = eventDate
            ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : '';

        let text = `Hi, I'd like to book a shoot.\n\n`;
        text += `Name: ${name}\n`;
        text += `Phone: ${phone}\n`;
        text += `Service: ${service}\n`;
        text += `Event date: ${formattedDate}\n`;
        text += `Location: ${location}`;
        if (message) {
            text += `\n\nMessage: ${message}`;
        }

        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

        // Open WhatsApp right now, inside the tap: phones block pop-ups opened after a delay.
        let waWindow = null;
        try { waWindow = window.open(url, '_blank'); if (waWindow) waWindow.opener = null; } catch (err) { waWindow = null; }

        submitButton.classList.add('is-loading');
        submitButton.querySelector('.btn-label').textContent = 'Sending';
        submitButton.disabled = true;
        showStatus('Sending your request…', false);

        let saved = false;
        try {
            const r = await window.VKLead.send({ source: 'contact', name, phone, service, eventDate, location, message, website: honeypot });
            saved = !!(r && r.ok);
        } catch (err) { saved = false; }

        submitButton.classList.remove('is-loading');
        submitButton.querySelector('.btn-label').textContent = 'Book your shoot';
        submitButton.disabled = false;

        if (saved && waWindow) {
            showStatus('Thank you! Your request is saved and WhatsApp is open. Please send the message to confirm your booking.', false);
        } else if (saved) {
            showStatus('Thank you! Your request is saved. Your phone blocked WhatsApp from opening, so please tap here:', false, url);
        } else {
            showStatus('We could not save your request online. Please send it on WhatsApp or call +91 72070 46157 so we do not miss it.', true, waWindow ? null : url);
        }
    });
});
// Mobile sidebar: opens from the side when the hamburger button is
// tapped, closes via the X button, the overlay, Escape, or picking a link
(() => {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('sidebarClose');
  if (!menuBtn || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.classList.add('no-scroll');
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', openSidebar);
  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.sidebar-links a').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
})();
