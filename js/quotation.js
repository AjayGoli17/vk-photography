// ---- Icon set: black stroke-based SVGs replacing emoji glyphs ----
const ICONS = {
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="6" width="14" height="12" rx="2"></rect><path d="M16 10l6-3v10l-6-3"></path></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"></path><circle cx="12" cy="14" r="3.5"></circle></svg>',
    drone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="6" r="2"></circle><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle><path d="M8 7l3 3M16 7l-3 3M8 17l3-3M16 17l-3-3"></path><rect x="9.5" y="9.5" width="5" height="5" rx="1"></rect></svg>',
    screen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="3" y="4" width="18" height="12" rx="2"></rect><path d="M8 20h8M12 16v4"></path></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z"></path><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20"></path></svg>',
    broadcast: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><circle cx="12" cy="12" r="2.5"></circle><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13"></path></svg>',
    cameraFlash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"></path><circle cx="12" cy="14" r="3"></circle><path d="M17 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1Z"></path></svg>',
    reel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5"></path></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="20" height="20"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"></path></svg>'
};

// ---- Data: services per stage, grouped by top-level category ----
// (prices carried over from the original checkbox-based quotation.html)
const categoryData = {
    'Wedding Photography': {
        stages: ['pre-wedding', 'engagement', 'haldi', 'rituals', 'sangeet', 'wedding-day', 'reception']
    },
    'Baby Photography': {
        stages: ['babyshower', 'baby-shoot', 'birthday']
    },
    'Corporate Photography': {
        stages: ['corporate-event']
    }
};

const stageData = {
    'pre-wedding': {
        title: 'Pre Wedding Services',
        label: 'Pre Wedding',
        services: [
            { name: 'Cinematic', price: 15000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 10000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Drone', price: 8000, icon: 'drone', desc: 'Breathtaking perspectives from above.' }
        ]
    },
    'engagement': {
        title: 'Engagement Services',
        label: 'Engagement',
        services: [
            { name: 'Regular Photography', price: 5000, icon: 'camera', desc: 'Standard photo coverage of the event.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' }
        ]
    },
    'haldi': {
        title: 'Haldi Services',
        label: 'Haldi',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Regular Photography', price: 5000, icon: 'camera', desc: 'Standard photo coverage of the event.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' }
        ]
    },
    'rituals': {
        title: 'Rituals Services',
        label: 'Rituals',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Regular Photography', price: 5000, icon: 'camera', desc: 'Standard photo coverage of the event.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' }
        ]
    },
    'sangeet': {
        title: 'Sangeet Services',
        label: 'Sangeet',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Regular Photography', price: 5000, icon: 'camera', desc: 'Standard photo coverage of the event.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' }
        ]
    },
    'wedding-day': {
        title: 'Wedding Day Services',
        label: 'Wedding Day',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Regular Photography', price: 5000, icon: 'camera', desc: 'Standard photo coverage of the event.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' },
            { name: 'Drone', price: 8000, icon: 'drone', desc: 'Breathtaking perspectives from above.' },
            { name: '8x12 Screen', price: 12000, icon: 'screen', desc: 'Live LED screen display at the venue.' }
        ]
    },
    'reception': {
        title: 'Reception Services',
        label: 'Reception',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Regular Photography', price: 5000, icon: 'camera', desc: 'Standard photo coverage of the event.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' },
            { name: 'Drone', price: 8000, icon: 'drone', desc: 'Breathtaking perspectives from above.' },
            { name: '8x12 Screen', price: 12000, icon: 'screen', desc: 'Live LED screen display at the venue.' }
        ]
    },
    'babyshower': {
        title: 'Babyshower Services',
        label: 'Babyshower',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Regular Video', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' }
        ]
    },
    'baby-shoot': {
        title: 'Baby Shoot Services',
        label: 'Baby Shoot',
        services: [
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Videography', price: 5000, icon: 'video', desc: 'Standard video coverage of the shoot.' },
            { name: 'Drone', price: 8000, icon: 'drone', desc: 'Breathtaking perspectives from above.' }
        ]
    },
    'birthday': {
        title: 'Birthday Services',
        label: 'Birthday',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Videography', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' },
            { name: 'Drone', price: 8000, icon: 'drone', desc: 'Breathtaking perspectives from above.' }
        ]
    },
    'corporate-event': {
        title: 'Corporate Event Services',
        label: 'Corporate Event',
        services: [
            { name: 'Cinematic', price: 10000, icon: 'video', desc: 'High-end storytelling film in 4K.' },
            { name: 'Candid', price: 7000, icon: 'camera', desc: 'Natural moments and editorial style.' },
            { name: 'Videography', price: 5000, icon: 'video', desc: 'Standard video coverage of the event.' },
            { name: 'Drone', price: 8000, icon: 'drone', desc: 'Breathtaking perspectives from above.' },
            { name: '8x12 Screen', price: 12000, icon: 'screen', desc: 'Live LED screen display at the venue.' }
        ]
    }
};

// Add-on prices are placeholders — adjust to your actual rates.
const addonData = [
    { name: 'Heirloom Album', price: 6000, icon: 'book' },
    { name: 'Live Stream', price: 4000, icon: 'broadcast' },
    { name: 'LED Wall', price: 12000, icon: 'screen' },
    { name: 'Photo Booth', price: 8000, icon: 'cameraFlash' },
    { name: 'Instagram Reels', price: 3000, icon: 'reel' },
    { name: 'Express Delivery', price: 5000, icon: 'bolt' }
];

const selections = {};
Object.keys(stageData).forEach(k => selections[k] = new Set());
const selectedAddons = new Set();

let currentCategory = 'Wedding Photography';
let currentStage = categoryData[currentCategory].stages[0];

const stagesList = document.getElementById('stages-list');
const stageTitle = document.getElementById('current-stage-title');
const servicesGrid = document.getElementById('services-grid');
const addonsGrid = document.getElementById('addons-grid');
const eventCategorySelect = document.getElementById('event-category');
const summaryCategory = document.getElementById('summary-category');
const summaryServices = document.getElementById('summary-services');
const summaryAddonsWrap = document.getElementById('summary-addons-wrap');
const summaryAddons = document.getElementById('summary-addons');
const summaryTotal = document.getElementById('summary-total');
const summaryCustomerWrap = document.getElementById('summary-customer-wrap');
const summaryCustomer = document.getElementById('summary-customer');
const summaryEventWrap = document.getElementById('summary-event-wrap');
const summaryEvent = document.getElementById('summary-event');
const summaryRequirementsWrap = document.getElementById('summary-requirements-wrap');
const summaryRequirements = document.getElementById('summary-requirements');
const saveBtn = document.getElementById('save-selection-btn');

function renderStagesList() {
    stagesList.innerHTML = '';
    const stages = categoryData[currentCategory].stages;
    stages.forEach(stageKey => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stage-btn' + (stageKey === currentStage ? ' active' : '');
        btn.dataset.stage = stageKey;
        btn.textContent = stageData[stageKey].label;
        btn.addEventListener('click', () => {
            currentStage = stageKey;
            renderStagesList();
            renderServiceGrid();
        });
        stagesList.appendChild(btn);
    });
}

function renderServiceGrid() {
    const stage = stageData[currentStage];
    stageTitle.textContent = stage.title;
    servicesGrid.innerHTML = '';
    stage.services.forEach(svc => {
        const isSelected = selections[currentStage].has(svc.name);
        const card = document.createElement('div');
        card.className = 'service-card' + (isSelected ? ' selected' : '');
        card.dataset.service = svc.name;
        card.innerHTML = `
            <span class="icon">${ICONS[svc.icon]}</span>
            <div>
                <h4>${svc.name}</h4>
                <p>${svc.desc}</p>
                <p class="price">₹${svc.price.toLocaleString('en-IN')}</p>
            </div>`;
        card.addEventListener('click', () => {
            if (selections[currentStage].has(svc.name)) {
                selections[currentStage].delete(svc.name);
                card.classList.remove('selected');
            } else {
                selections[currentStage].add(svc.name);
                card.classList.add('selected');
            }
            updateSummary();
        });
        servicesGrid.appendChild(card);
    });
    servicesGrid.style.opacity = '0';
    setTimeout(() => {
        servicesGrid.style.transition = 'opacity 0.3s ease';
        servicesGrid.style.opacity = '1';
    }, 30);
}

function renderAddons() {
    addonsGrid.innerHTML = '';
    addonData.forEach(addon => {
        const card = document.createElement('div');
        card.className = 'addon-card';
        card.dataset.addon = addon.name;
        card.innerHTML = `
            <span class="icon">${ICONS[addon.icon]}</span>
            <p>${addon.name}</p>
            <p class="addon-price">₹${addon.price.toLocaleString('en-IN')}</p>`;
        card.addEventListener('click', () => {
            if (selectedAddons.has(addon.name)) {
                selectedAddons.delete(addon.name);
                card.classList.remove('selected');
            } else {
                selectedAddons.add(addon.name);
                card.classList.add('selected');
            }
            updateSummary();
        });
        addonsGrid.appendChild(card);
    });
}

// Builds a row for a labeled field inside a summary-list block.
function summaryRow(label, value) {
    const row = document.createElement('div');
    row.className = 'summary-item';
    row.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
    return row;
}

// Summary aggregates selections across ALL stages/categories, not just the
// currently active one — so switching categories keeps prior picks in the total.
function updateSummary() {
    // Customer details
    const custName = document.getElementById('customer-name').value.trim();
    const custPhone = document.getElementById('customer-phone').value.trim();
    const custEmail = document.getElementById('customer-email').value.trim();
    summaryCustomer.innerHTML = '';
    let anyCustomer = false;
    if (custName) { summaryCustomer.appendChild(summaryRow('Name', custName)); anyCustomer = true; }
    if (custPhone) { summaryCustomer.appendChild(summaryRow('Phone', custPhone)); anyCustomer = true; }
    if (custEmail) { summaryCustomer.appendChild(summaryRow('Email', custEmail)); anyCustomer = true; }
    summaryCustomerWrap.style.display = anyCustomer ? '' : 'none';

    // Event details
    const evtDate = document.getElementById('event-date').value.trim();
    const evtLocation = document.getElementById('event-location').value.trim();
    const evtGuests = document.getElementById('event-guests').value.trim();
    summaryEvent.innerHTML = '';
    let anyEvent = false;
    if (evtDate) { summaryEvent.appendChild(summaryRow('Date', evtDate)); anyEvent = true; }
    if (evtLocation) { summaryEvent.appendChild(summaryRow('Location', evtLocation)); anyEvent = true; }
    if (evtGuests) { summaryEvent.appendChild(summaryRow('Guests', evtGuests)); anyEvent = true; }
    summaryEventWrap.style.display = anyEvent ? '' : 'none';

    // Special requirements
    const requirements = document.getElementById('special-requirements').value.trim();
    if (requirements) {
        summaryRequirements.textContent = requirements;
        summaryRequirementsWrap.style.display = '';
    } else {
        summaryRequirementsWrap.style.display = 'none';
    }

    summaryServices.innerHTML = '';
    let total = 0;
    let anyService = false;

    Object.keys(stageData).forEach(stageKey => {
        const chosen = Array.from(selections[stageKey]);
        if (chosen.length === 0) return;
        anyService = true;
        const stagePrices = stageData[stageKey].services;
        chosen.forEach(name => {
            const svc = stagePrices.find(s => s.name === name);
            if (svc) total += svc.price;
        });
        const row = document.createElement('div');
        row.className = 'summary-item';
        const serviceText = chosen.map(name => {
            const svc = stagePrices.find(s => s.name === name);
            return svc ? `${name} (₹${svc.price.toLocaleString('en-IN')})` : name;
        }).join(', ');
        row.innerHTML = `<span class="label">${stageData[stageKey].label}</span><span class="value">${serviceText}</span>`;
        summaryServices.appendChild(row);
    });

    if (!anyService) {
        summaryServices.innerHTML = '<div class="summary-empty">No services selected yet</div>';
    }

    if (selectedAddons.size > 0) {
        summaryAddonsWrap.style.display = '';
        summaryAddons.innerHTML = '';
        selectedAddons.forEach(name => {
            const addon = addonData.find(a => a.name === name);
            total += addon.price;
            const row = document.createElement('div');
            row.className = 'summary-item';
            row.innerHTML = `<span class="label">${addon.name}</span><span class="value">₹${addon.price.toLocaleString('en-IN')}</span>`;
            summaryAddons.appendChild(row);
        });
    } else {
        summaryAddonsWrap.style.display = 'none';
    }

    summaryTotal.textContent = '₹' + total.toLocaleString('en-IN');
}

saveBtn.addEventListener('click', () => {
    updateSummary();
    saveBtn.classList.add('save-flash');
    const original = saveBtn.textContent;
    saveBtn.textContent = 'Saved ✓';
    setTimeout(() => {
        saveBtn.classList.remove('save-flash');
        saveBtn.textContent = original;
    }, 700);
});

eventCategorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    currentStage = categoryData[currentCategory].stages[0];
    summaryCategory.textContent = currentCategory;
    renderStagesList();
    renderServiceGrid();
});

// Keep the summary's customer/event/requirements sections live as the user types.
['customer-name', 'customer-phone', 'customer-email', 'event-date', 'event-location', 'event-guests', 'special-requirements']
    .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateSummary);
    });

renderStagesList();
renderServiceGrid();
renderAddons();
updateSummary();

const WHATSAPP_NUMBER = '918978367995'; // country code 91 + 8978367995
const STUDIO_NAME = 'VK Photography';
const STUDIO_ADDRESS = 'VK Colour Lab Digital Photo Studio, Hyderabad';
const STUDIO_PHONE = '+91 89783 67995';

// ---- Preload logo so it's ready by the time the PDF is generated ----
let logoBase64 = null;
(async function preloadLogo() {
    try {
        const res = await fetch('logo.png');
        const blob = await res.blob();
        logoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('Logo preload failed, PDF will render without it:', err);
    }
})();

// ---- Shared: gather form + selection data into one object ----
function collectQuoteData() {
    const name = document.getElementById('customer-name').value || 'Customer';
    const phone = document.getElementById('customer-phone').value || '';
    const email = document.getElementById('customer-email').value || '';
    const category = eventCategorySelect.value;
    const date = document.getElementById('event-date').value || '';
    const location = document.getElementById('event-location').value || '';
    const guests = document.getElementById('event-guests').value || '';
    const requirements = document.getElementById('special-requirements').value || '';

    const items = [];
    Object.keys(stageData).forEach(stageKey => {
        const chosen = Array.from(selections[stageKey]);
        if (chosen.length === 0) return;
        const stagePrices = stageData[stageKey].services;
        chosen.forEach(svcName => {
            const svc = stagePrices.find(s => s.name === svcName);
            if (svc) {
                items.push({ desc: `${stageData[stageKey].label} — ${svc.name}`, qty: 1, unit: svc.price });
            }
        });
    });
    selectedAddons.forEach(addonName => {
        const addon = addonData.find(a => a.name === addonName);
        if (addon) items.push({ desc: `Add-on — ${addon.name}`, qty: 1, unit: addon.price });
    });

    const total = items.reduce((sum, it) => sum + it.qty * it.unit, 0);

    return { name, phone, email, category, date, location, guests, requirements, items, total };
}

// ---- PDF quotation generation ----
function generateQuotePDF() {
    if (!window.jspdf) {
        alert('PDF library failed to load. Please check your connection and try again.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 50;
    const navy = '#0b2d55';
    const gray = '#4e4637';
    const ink = '#1b1c1c';

    const data = collectQuoteData();
    const quoteNumber = 'VKQ' + Date.now().toString().slice(-8);
    const quoteDate = new Date();
    const dueDate = new Date(quoteDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toLocaleDateString('en-GB').split('/').join('-');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(navy);
    doc.text(STUDIO_NAME, margin, 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(gray);
    doc.text('Hyderabad', margin, 74);
    doc.text(STUDIO_PHONE, margin, 88);

    // Logo, top-right
    const logoW = 90;
    const logoH = 40;
    const logoX = pageWidth - margin - logoW;
    const logoY = 20;
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, 'PNG', logoX, logoY, logoW, logoH, undefined, 'FAST');
        } catch (err) {
            console.warn('Could not draw logo in PDF:', err);
        }
    }

    // Bill To / meta
    let y = 140;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(navy);
    doc.text('BILL TO', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(ink);
    doc.text(data.name, margin, y + 18);
    doc.setFontSize(10);
    doc.setTextColor(gray);
    if (data.phone) doc.text(data.phone, margin, y + 34);
    if (data.email) doc.text(data.email, margin, y + 48);

    const metaRight = pageWidth - margin;
    const metaLabelX = pageWidth - 190;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(navy);
    doc.text('Quote #', metaLabelX, y);
    doc.text('Quote date', metaLabelX, y + 18);
    doc.text('Valid until', metaLabelX, y + 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(ink);
    doc.text(quoteNumber, metaRight, y, { align: 'right' });
    doc.text(fmt(quoteDate), metaRight, y + 18, { align: 'right' });
    doc.text(fmt(dueDate), metaRight, y + 36, { align: 'right' });

    // Event details
    y += 80;
    doc.setDrawColor('#d2c5b1');
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(navy);
    doc.text('EVENT DETAILS', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(ink);
    doc.text(`Category: ${data.category}`, margin, y);
    doc.text(`Date: ${data.date || 'To be confirmed'}`, margin + 220, y);
    y += 16;
    doc.text(`Location: ${data.location || 'To be confirmed'}`, margin, y);
    doc.text(`Guests: ${data.guests || 'N/A'}`, margin + 220, y);
    y += 30;

    // Table
    const colQty = margin;
    const colDesc = margin + 36;
    const colUnitRight = pageWidth - margin - 90;
    const colAmountRight = pageWidth - margin;

    doc.setFillColor(navy);
    doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
    doc.setTextColor('#ffffff');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('QTY', colQty + 4, y + 16);
    doc.text('Description', colDesc, y + 16);
    doc.text('Unit Price', colUnitRight, y + 16, { align: 'right' });
    doc.text('Amount', colAmountRight, y + 16, { align: 'right' });
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(ink);
    doc.setFontSize(10);

    if (data.items.length === 0) {
        y += 22;
        doc.text('No services selected', colDesc, y);
    } else {
        data.items.forEach(it => {
            y += 22;
            if (y > 720) { doc.addPage(); y = 60; }
            doc.text(String(it.qty), colQty + 4, y);
            doc.text(it.desc, colDesc, y);
            doc.text('Rs. ' + it.unit.toLocaleString('en-IN'), colUnitRight, y, { align: 'right' });
            doc.text('Rs. ' + (it.qty * it.unit).toLocaleString('en-IN'), colAmountRight, y, { align: 'right' });
        });
    }
    y += 14;
    doc.setDrawColor('#d2c5b1');
    doc.line(margin, y, pageWidth - margin, y);
    y += 26;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Subtotal', colUnitRight - 90, y);
    doc.text('Rs. ' + data.total.toLocaleString('en-IN'), colAmountRight, y, { align: 'right' });
    y += 26;

    doc.setFillColor('#f0ece0');
    doc.rect(colUnitRight - 100, y - 15, (colAmountRight) - (colUnitRight - 100) + 4, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(navy);
    doc.text('Estimated Total (INR)', colUnitRight - 90, y);
    doc.text('Rs. ' + data.total.toLocaleString('en-IN'), colAmountRight, y, { align: 'right' });
    y += 50;

    // Special requirements
    if (data.requirements) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(navy);
        doc.text('SPECIAL REQUIREMENTS', margin, y);
        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(ink);
        const lines = doc.splitTextToSize(data.requirements, pageWidth - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 14 + 20;
    }

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(navy);
    doc.text('TERMS AND CONDITIONS', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(ink);
    doc.text('This quotation is an estimate only and is valid for 15 days from the quote date.', margin, y);
    y += 14;
    doc.text('A booking is confirmed only after advance payment and written confirmation from the studio.', margin, y);
    y += 60;

    // Signature
    doc.setDrawColor(ink);
    doc.setLineWidth(0.7);
    doc.line(pageWidth - margin - 180, y, pageWidth - margin, y);
    doc.setFontSize(9);
    doc.setTextColor(gray);
    doc.text('Customer Signature', pageWidth - margin - 90, y + 14, { align: 'center' });

    // Return the built doc instead of saving directly — caller decides what to do with it
    return { doc, quoteNumber, data };
}

// ---- Google Apps Script config ----
// After deploying your Apps Script as a Web App (see setup notes), paste the
// resulting /exec URL here.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5eya2N0MBi2zFAgN_pwNGDFwd78Uxz3nbyvANz7ShQ9suFHH3WAKKB_uAYDFyzKR1/exec';

// ---- CTA state machine: idle -> sending -> success | error ----
function setCtaState(state) {
    ['idle', 'sending', 'success', 'error'].forEach(s => {
        const el = document.getElementById('cta-' + s);
        if (el) el.style.display = (s === state) ? '' : 'none';
    });
}

const ctaRetryBtn = document.getElementById('cta-retry-btn');
if (ctaRetryBtn) {
    ctaRetryBtn.addEventListener('click', () => setCtaState('idle'));
}
const ctaCallBtn = document.getElementById('cta-call-btn');
if (ctaCallBtn) {
    ctaCallBtn.href = 'tel:' + STUDIO_PHONE.replace(/\s+/g, '');
}

async function sendQuotePDFByEmail() {
    setCtaState('sending');

    const { doc, quoteNumber, data } = generateQuotePDF();
    const pdfBase64 = doc.output('datauristring').split(',')[1]; // strip the data: prefix
    const fileName = `${STUDIO_NAME.replace(/\s+/g, '-')}-Quote-${quoteNumber}.pdf`;

    const payload = {
        customer_name: data.name,
        customer_phone: data.phone || 'N/A',
        customer_email: data.email || 'N/A',
        event_category: data.category,
        event_date: data.date || 'N/A',
        event_location: data.location || 'N/A',
        event_guests: data.guests || 'N/A',
        estimated_total: '₹' + data.total.toLocaleString('en-IN'),
        special_requirements: data.requirements || 'None',
        pdf_base64: pdfBase64,
        file_name: fileName
    };

    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            // Apps Script doPost reads the raw body regardless of content-type;
            // using text/plain avoids a CORS preflight that application/json would trigger.
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result && result.status === 'success') {
            setCtaState('success');
        } else {
            throw new Error((result && result.message) || 'Unknown error from Apps Script');
        }
    } catch (err) {
        console.error('Apps Script send failed:', err);
        setCtaState('error');
    }
}

document.getElementById('quotation-form').addEventListener('submit', (e) => {
    e.preventDefault();
    sendQuotePDFByEmail();
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