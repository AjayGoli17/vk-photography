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
    const submitLabel = submitButton.querySelector('.btn-label');
    const IDLE_LABEL = 'Book your shoot';
    const whatsappNumber = '917207046157';

    const statusEl = document.getElementById('formStatus');
    const dateInput = document.getElementById('event-date');
    if (dateInput) {
        const t = new Date();
        t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
        dateInput.min = t.toISOString().slice(0, 10);   // no dates in the past
    }

    // ---- result message under the button (success / error) ----
    function showStatus(message, kind, linkUrl) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.toggle('is-error', kind === 'error');
        statusEl.classList.toggle('is-success', kind === 'success');
        if (linkUrl) {
            statusEl.appendChild(document.createTextNode(' '));
            const a = document.createElement('a');
            a.href = linkUrl; a.target = '_blank'; a.rel = 'noopener';
            a.textContent = 'Open WhatsApp';
            statusEl.appendChild(a);
        }
        statusEl.hidden = false;
    }

    // ---- inline field errors ----
    const PHONE_RE = /^(?:(?:\+?91|0)?[6-9]\d{9}|\+\d{8,15})$/;
    const rules = {
        'name': (v) => (v.length < 2 ? 'Please enter your name.' : ''),
        'phone': (v) => {
            if (!v) return 'Please enter your phone number.';
            return PHONE_RE.test(v.replace(/[\s\-().]/g, '')) ? '' : 'Enter a valid phone number, e.g. 98765 43210.';
        },
        'service': (v) => (v ? '' : 'Please choose a service.'),
        'event-date': (v) => {
            if (!v) return 'Please pick your event date.';
            return dateInput && dateInput.min && v < dateInput.min ? 'That date is in the past. Please pick a future date.' : '';
        },
        'location': (v) => (v.length < 2 ? 'Please tell us the venue or city.' : '')
    };

    function setFieldError(id, message) {
        const input = document.getElementById(id);
        const err = document.getElementById('err-' + id);
        if (!input || !err) return;
        err.textContent = message;
        err.hidden = !message;
        input.classList.toggle('has-error', !!message);
        if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }

    function validateField(id) {
        const input = document.getElementById(id);
        const message = rules[id](input.value.trim());
        setFieldError(id, message);
        return !message;
    }

    function validateAll() {
        let firstBad = null;
        Object.keys(rules).forEach((id) => {
            if (!validateField(id) && !firstBad) firstBad = document.getElementById(id);
        });
        return firstBad;
    }

    Object.keys(rules).forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('blur', () => { if (input.value.trim() || input.classList.contains('has-error')) validateField(id); });
        const clear = () => { if (input.classList.contains('has-error')) validateField(id); };
        input.addEventListener('input', clear);
        input.addEventListener('change', clear);
    });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitButton.disabled) return;

        const firstBad = validateAll();
        if (firstBad) {
            showStatus('Please fix the highlighted fields and try again.', 'error');
            firstBad.focus();
            return;
        }
        if (statusEl) statusEl.hidden = true;

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
        submitLabel.textContent = 'Sending…';
        submitButton.disabled = true;
        submitButton.setAttribute('aria-busy', 'true');
        showStatus('Sending your request…', null);

        let saved = false;
        try {
            const r = await window.VKLead.send({ source: 'contact', name, phone, service, eventDate, location, message, website: honeypot });
            saved = !!(r && r.ok);
        } catch (err) { saved = false; }

        submitButton.classList.remove('is-loading');
        submitButton.removeAttribute('aria-busy');
        submitButton.disabled = false;
        submitLabel.textContent = saved ? 'Request sent ✓' : IDLE_LABEL;
        if (saved) setTimeout(() => { submitLabel.textContent = IDLE_LABEL; }, 4000);

        if (saved && waWindow) {
            bookingForm.reset();
            showStatus('Thank you! Your request is saved and WhatsApp is open. Please send the message there to confirm your booking.', 'success');
        } else if (saved) {
            bookingForm.reset();
            showStatus('Thank you! Your request is saved. Your phone blocked WhatsApp from opening, so please tap here:', 'success', url);
        } else {
            showStatus('We could not save your request online. Please send it on WhatsApp or call +91 72070 46157 so we do not miss it.', 'error', waWindow ? null : url);
        }
        statusEl.focus();
        statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
});
