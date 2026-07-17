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

// Summary aggregates selections across ALL stages/categories, not just the
// currently active one — so switching categories keeps prior picks in the total.
function updateSummary() {
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
        row.innerHTML = `<span class="label">${stageData[stageKey].label}</span><span class="value">${chosen.join(', ')}</span>`;
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

renderStagesList();
renderServiceGrid();
renderAddons();
updateSummary();

const WHATSAPP_NUMBER = '918978367995'; // country code 91 + 8978367995

document.getElementById('quotation-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('customer-name').value || 'N/A';
    const phone = document.getElementById('customer-phone').value || 'N/A';
    const email = document.getElementById('customer-email').value || 'N/A';
    const category = eventCategorySelect.value;
    const date = document.getElementById('event-date').value || 'N/A';
    const location = document.getElementById('event-location').value || 'N/A';
    const guests = document.getElementById('event-guests').value || 'N/A';
    const requirements = document.getElementById('special-requirements').value || 'None';

    let msg = `*New Quotation Request*\n\n`;
    msg += `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\n`;
    msg += `Category: ${category}\nDate: ${date}\nLocation: ${location}\nGuests: ${guests}\n\n`;
    msg += `*Services:*\n`;

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
        msg += `- ${stageData[stageKey].label}: ${chosen.join(', ')}\n`;
    });
    if (!anyService) msg += `- None selected\n`;

    if (selectedAddons.size > 0) {
        msg += `\n*Add-ons:*\n`;
        selectedAddons.forEach(name => {
            const addon = addonData.find(a => a.name === name);
            total += addon.price;
            msg += `- ${addon.name} (₹${addon.price.toLocaleString('en-IN')})\n`;
        });
    }

    msg += `\n*Estimated Total: ₹${total.toLocaleString('en-IN')}*\n\n`;
    msg += `Special Requirements: ${requirements}`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
});