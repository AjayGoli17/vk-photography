/* ============================================================
   VK PHOTOGRAPHY — PERSONALIZED PHOTOFRAME SHOP
   Drives shop.html: product data, view switching, customizer,
   cart, checkout, payment (demo) and confirmation.
   ============================================================ */

/* ------------------------------------------------------------
   PRODUCT DATA — shared with the server (see js/shop-pricing.js
   and netlify/functions/create-order.js) so the browser and the
   Razorpay order-creation function always agree on prices.
   Change prices/add frames/sizes in js/shop-pricing.js only.
   ------------------------------------------------------------ */
  const { FRAMES, SIZES, ORIENTATIONS, FINISHES, MATS, SHIPPING_FEE } = window.VKPricing;

  /* Razorpay Checkout — the public Key ID is safe to expose to the
     browser and is returned by the create-order function on each
     request, so nothing sensitive is hardcoded here. */
  const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
  
  /* ------------------------------------------------------------
     STORAGE HELPERS
     NOTE: cart/order data lives only in this browser's localStorage.
     There is no server yet — see the WhatsApp/Sheets/backend options
     discussed separately for actually receiving orders.
     ------------------------------------------------------------ */
  const Store = {
    getCart() { try { return JSON.parse(localStorage.getItem("vk_cart")) || []; } catch { return []; } },
    setCart(cart) { localStorage.setItem("vk_cart", JSON.stringify(cart)); },
    getOrder() { try { return JSON.parse(localStorage.getItem("vk_order")); } catch { return null; } },
    setOrder(order) { localStorage.setItem("vk_order", JSON.stringify(order)); },
  };
  
  /* ------------------------------------------------------------
     CUSTOMIZER STATE
     ------------------------------------------------------------ */
  const customizerState = {
    frameId: "classic-black",
    sizeId: "12x18",
    orientation: "portrait",
    finishId: "matte",
    matId: "no-mat",
    photoDataUrl: null,
    photoNaturalW: 0,
    photoNaturalH: 0,
    transform: { x: 0, y: 0, scale: 1 },
  };
  
  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    initShop();
    initCustomizer();
    updateCartCount();
    initCartDrawer();
    initCheckoutForm();
    initPaymentPage();
  });
  
  /* ------------------------------------------------------------
     SHOP LANDING — render frame collection cards
     ------------------------------------------------------------ */
  function initShop() {
    const grid = document.getElementById("frameGrid");
    if (!grid) return;
  
    grid.innerHTML = FRAMES.map((f) => `
      <article class="frame-card">
        <div class="frame-thumb">
          <div class="thumb-frame" data-frame="${f.id}" role="img" aria-label="${f.name} photoframe example">
            <div class="thumb-mat">
              <div class="thumb-window">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
            </div>
          </div>
        </div>
        <div class="frame-card-body">
          <h3>${f.name}</h3>
          <p>${f.description}</p>
          <div class="frame-price">From <strong>${formatINR(f.basePrice)}</strong></div>
          <button class="shop-btn shop-btn-outline shop-btn-sm customize-btn" type="button" data-frame-id="${f.id}">Customize</button>
        </div>
      </article>
    `).join("");
  
    grid.querySelectorAll(".customize-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        customizerState.frameId = btn.dataset.frameId;
        openCustomizer();
      });
    });
  
    document.getElementById("ctaCreate")?.addEventListener("click", (e) => { e.preventDefault(); openCustomizer(); });
    document.getElementById("footerCreateFrame")?.addEventListener("click", (e) => { e.preventDefault(); openCustomizer(); });
    document.getElementById("backToCollection")?.addEventListener("click", () => switchView("Shop"));
  }
  
  function openCustomizer() {
    switchView("Customizer");
    refreshCustomizerUI();
  }
  
  function switchView(view) {
    ["Shop", "Customizer", "Checkout", "Payment", "Confirmation"].forEach((v) => {
      document.getElementById(`view${v}`)?.classList.remove("active");
    });
    document.getElementById(`view${view}`)?.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  
    const mobileCta = document.getElementById("mobileCta");
    if (view === "Customizer") {
      mobileCta?.classList.add("show");
      document.body.classList.add("has-sticky-cta");
    } else {
      mobileCta?.classList.remove("show");
      document.body.classList.remove("has-sticky-cta");
    }
  }
  
  /* ============================================================
     CUSTOMIZER
     ============================================================ */
  function initCustomizer() {
    if (!document.getElementById("viewCustomizer")) return;
  
    renderOptionGroup("orientationOptions", ORIENTATIONS.map((o) => ({ id: o.id, name: o.name, sub: o.sub })), customizerState.orientation, (id) => { customizerState.orientation = id; refreshCustomizerUI(); });
    renderOptionGroup("sizeOptions", SIZES.map((s) => ({ id: s.id, name: s.label, price: formatINR(s.basePrice), sub: s.note })), customizerState.sizeId, (id) => { customizerState.sizeId = id; refreshCustomizerUI(); });
    renderOptionGroup("frameOptions", FRAMES.map((f) => ({ id: f.id, name: f.name, price: f.priceModifier === 0 ? "+₹0" : `+${formatINR(f.priceModifier)}`, swatch: f.id })), customizerState.frameId, (id) => { customizerState.frameId = id; refreshCustomizerUI(); });
    renderOptionGroup("finishOptions", FINISHES.map((f) => ({ id: f.id, name: f.name, price: f.priceModifier === 0 ? "+₹0" : `+${formatINR(f.priceModifier)}` })), customizerState.finishId, (id) => { customizerState.finishId = id; refreshCustomizerUI(); });
    renderOptionGroup("matOptions", MATS.map((m) => ({ id: m.id, name: m.name, price: m.priceModifier === 0 ? "+₹0" : `+${formatINR(m.priceModifier)}` })), customizerState.matId, (id) => { customizerState.matId = id; refreshCustomizerUI(); });
  
    initPhotoUpload();
    initCropControls();
  
    document.getElementById("addToCartBtn")?.addEventListener("click", addToCart);
    document.getElementById("mobileAddToCart")?.addEventListener("click", addToCart);
  
    refreshCustomizerUI();
  }
  
  function renderOptionGroup(containerId, options, selectedId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = options.map((opt) => `
      <button type="button" class="option-card" data-id="${opt.id}" aria-pressed="${opt.id === selectedId}">
        ${opt.swatch ? `<span class="swatch ${opt.swatch}"></span>` : ""}
        <span class="option-name">${opt.name}</span>
        ${opt.price ? `<span class="option-price">${opt.price}</span>` : ""}
        ${opt.sub ? `<span class="option-sub">${opt.sub}</span>` : ""}
      </button>
    `).join("");
  
    container.querySelectorAll(".option-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".option-card").forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        onSelect(btn.dataset.id);
      });
    });
  }
  
  /* ---------------- Photo upload ---------------- */
  function initPhotoUpload() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");
    if (!uploadArea || !fileInput) return;
  
    fileInput.addEventListener("change", (e) => handlePhotoUpload(e.target.files[0]));
  
    uploadArea.addEventListener("dragover", (e) => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
    uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));
    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("drag-over");
      if (e.dataTransfer.files[0]) handlePhotoUpload(e.dataTransfer.files[0]);
    });
  
    document.getElementById("changePhoto")?.addEventListener("click", () => fileInput.click());
    document.getElementById("removePhoto")?.addEventListener("click", removePhoto);
  }
  
  function handlePhotoUpload(file) {
    const errorEl = document.getElementById("uploadError");
    errorEl.hidden = true;
    if (!file) return;
  
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) { showFieldError(errorEl, "Please upload a JPG, PNG or WEBP image."); return; }
    if (file.size > 10 * 1024 * 1024) { showFieldError(errorEl, "That image is larger than 10MB — please choose a smaller file."); return; }
  
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        customizerState.photoDataUrl = e.target.result;
        customizerState.photoNaturalW = img.naturalWidth;
        customizerState.photoNaturalH = img.naturalHeight;
        customizerState.transform = { x: 0, y: 0, scale: 1 };
        showUploadedPhoto();
        autoFitPhoto();
        updateQuality();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  function showUploadedPhoto() {
    const fpImage = document.getElementById("fpImage");
    const fpEmpty = document.getElementById("fpEmpty");
    fpImage.src = customizerState.photoDataUrl;
    fpImage.hidden = false;
    fpImage.alt = "Your uploaded photo inside the selected frame";
    fpEmpty.hidden = true;
    document.getElementById("uploadActions").hidden = false;
    document.getElementById("cropControls").hidden = false;
    document.getElementById("cropHint").hidden = false;
  }
  
  function removePhoto() {
    customizerState.photoDataUrl = null;
    customizerState.transform = { x: 0, y: 0, scale: 1 };
    const fpImage = document.getElementById("fpImage");
    fpImage.hidden = true;
    fpImage.src = "";
    document.getElementById("fpEmpty").hidden = false;
    document.getElementById("uploadActions").hidden = true;
    document.getElementById("cropControls").hidden = true;
    document.getElementById("cropHint").hidden = true;
    document.getElementById("qualityBadge").hidden = true;
    document.getElementById("fileInput").value = "";
  }
  
  /* ---------------- Live preview ---------------- */
  function updatePreview() {
    const frame = getFrame();
    const size = getEffectiveSize();
    const mat = getMat();
    const finish = getFinish();
  
    const fpFrame = document.getElementById("fpFrame");
    const fpMat = document.getElementById("fpMat");
    const fpWindow = document.getElementById("fpWindow");
    fpFrame.dataset.frame = frame.id;
    fpMat.dataset.mat = mat.id;
    fpWindow.dataset.finish = finish.id;
  
    const maxW = 340, maxH = 420;
    let w = maxW, h = w / size.aspectRatio;
    if (h > maxH) { h = maxH; w = h * size.aspectRatio; }
    fpWindow.style.width = `${w}px`;
    fpWindow.style.height = `${h}px`;
  
    applyTransform();
  }
  
  function applyTransform() {
    const fpWindow = document.getElementById("fpWindow");
    const t = customizerState.transform;
    fpWindow.style.setProperty("--px", `${t.x}px`);
    fpWindow.style.setProperty("--py", `${t.y}px`);
    fpWindow.style.setProperty("--pz", t.scale);
  }
  
  /* ---------------- Crop / position controls ---------------- */
  function initCropControls() {
    const fpWindow = document.getElementById("fpWindow");
    if (!fpWindow) return;
  
    document.getElementById("zoomIn").addEventListener("click", () => zoom(0.1));
    document.getElementById("zoomOut").addEventListener("click", () => zoom(-0.1));
    document.getElementById("resetCrop").addEventListener("click", resetCrop);
    document.getElementById("autoFit").addEventListener("click", autoFitPhoto);
  
    let dragging = false, startX, startY, startTx, startTy;
  
    const startDrag = (clientX, clientY) => {
      if (!customizerState.photoDataUrl) return;
      dragging = true; startX = clientX; startY = clientY;
      startTx = customizerState.transform.x; startTy = customizerState.transform.y;
    };
    const moveDrag = (clientX, clientY) => {
      if (!dragging) return;
      customizerState.transform.x = startTx + (clientX - startX);
      customizerState.transform.y = startTy + (clientY - startY);
      applyTransform();
    };
    const endDrag = () => { dragging = false; };
  
    fpWindow.addEventListener("mousedown", (e) => startDrag(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);
    fpWindow.addEventListener("touchstart", (e) => startDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    fpWindow.addEventListener("touchmove", (e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    fpWindow.addEventListener("touchend", endDrag);
  }
  
  function zoom(delta) {
    if (!customizerState.photoDataUrl) return;
    const newScale = Math.min(3, Math.max(1, customizerState.transform.scale + delta));
    customizerState.transform.scale = Math.round(newScale * 100) / 100;
    applyTransform();
  }
  
  function resetCrop() { customizerState.transform = { x: 0, y: 0, scale: 1 }; applyTransform(); }
  
  function autoFitPhoto() {
    if (!customizerState.photoDataUrl) return;
    const fpWindow = document.getElementById("fpWindow");
    const winW = fpWindow.offsetWidth || 340;
    const winH = fpWindow.offsetHeight || 420;
    const imgW = customizerState.photoNaturalW, imgH = customizerState.photoNaturalH;
    if (!imgW || !imgH) return;
  
    const coverScale = Math.max(winW / imgW, winH / imgH);
    const fpImage = document.getElementById("fpImage");
    fpImage.style.width = `${imgW * coverScale}px`;
    fpImage.style.height = `${imgH * coverScale}px`;
  
    customizerState.transform = { x: 0, y: 0, scale: 1 };
    applyTransform();
  }
  
  /* ---------------- Photo quality check ---------------- */
  function updateQuality() {
    const badge = document.getElementById("qualityBadge");
    if (!customizerState.photoDataUrl) { badge.hidden = true; return; }
    const size = getEffectiveSize();
    const meetsMin = customizerState.photoNaturalW >= size.minResolution.w && customizerState.photoNaturalH >= size.minResolution.h;
    badge.hidden = false;
    if (meetsMin) { badge.className = "quality-badge good"; badge.textContent = `✓ Great quality for ${size.label}`; }
    else { badge.className = "quality-badge warn"; badge.textContent = `⚠ This photo may appear slightly soft at ${size.label}. A higher-resolution photo will look sharper.`; }
  }
  
  /* ---------------- Price calculation ---------------- */
  function calculatePrice() {
    const size = getSize(), frame = getFrame(), finish = getFinish(), mat = getMat();
    const total = size.basePrice + frame.priceModifier + finish.priceModifier + mat.priceModifier;
    return { size, frame, finish, mat, total };
  }
  
  function updatePrice() {
    const { frame, finish, mat, total } = calculatePrice();
    const effectiveSize = getEffectiveSize();
    document.getElementById("sumSize").textContent = `${effectiveSize.label} · ${ORIENTATIONS.find((o) => o.id === customizerState.orientation).name}`;
    document.getElementById("sumFrame").textContent = frame.name;
    document.getElementById("sumFinish").textContent = finish.name;
    document.getElementById("sumMat").textContent = mat.name;
    document.getElementById("sumTotal").textContent = formatINR(total);
    document.getElementById("mobileTotal").textContent = formatINR(total);
  }
  
  function refreshCustomizerUI() {
    updatePreview();
    if (customizerState.photoDataUrl) autoFitPhoto();
    updatePrice();
    updateQuality();
  }
  
  function getFrame() { return FRAMES.find((f) => f.id === customizerState.frameId); }
  function getSize() { return SIZES.find((s) => s.id === customizerState.sizeId); }
  function getFinish() { return FINISHES.find((f) => f.id === customizerState.finishId); }
  function getMat() { return MATS.find((m) => m.id === customizerState.matId); }
  
  /* Size as chosen, adjusted for the selected orientation — the
     printed sheet is the same paper size either way, just rotated,
     so basePrice stays the same and only aspect ratio / min
     resolution / label swap. */
  function getEffectiveSize() {
    const base = getSize();
    if (customizerState.orientation === "landscape") {
      return {
        ...base,
        aspectRatio: 1 / base.aspectRatio,
        minResolution: { w: base.minResolution.h, h: base.minResolution.w },
        label: swapDimensions(base.label),
      };
    }
    return base;
  }
  
  function swapDimensions(label) {
    const match = label.match(/^(\d+) × (\d+)(.*)$/);
    if (!match) return label;
    return `${match[2]} × ${match[1]}${match[3]}`;
  }
  
  /* ============================================================
     CART
     ============================================================ */
  function addToCart() {
    const errorEl = document.getElementById("uploadError");
    if (!customizerState.photoDataUrl) {
      showFieldError(errorEl, "Please upload your photo first.");
      document.getElementById("uploadArea").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  
    const { size, frame, finish, mat, total } = calculatePrice();
    const effectiveSize = getEffectiveSize();
    const orientationName = ORIENTATIONS.find((o) => o.id === customizerState.orientation).name;
    const item = {
      id: `item_${Date.now()}`, photo: customizerState.photoDataUrl,
      frameId: frame.id, frameName: frame.name, sizeId: size.id,
      sizeLabel: `${effectiveSize.label} · ${orientationName}`,
      finishId: finish.id, finishName: finish.name, matId: mat.id, matName: mat.name,
      unitPrice: total, quantity: 1,
    };
  
    const cart = Store.getCart();
    cart.push(item);
    Store.setCart(cart);
    updateCartCount();
    showToast("Added to cart");
    openCart();
  }
  
  function updateCartCount() {
    const count = Store.getCart().reduce((sum, i) => sum + i.quantity, 0);
    const el = document.getElementById("cartCount");
    if (!el) return;
    el.textContent = count;
    el.dataset.empty = count === 0 ? "true" : "false";
  }
  
  function renderCart() {
    const cart = Store.getCart();
    const container = document.getElementById("cartItems");
    if (!container) return;
  
    if (cart.length === 0) {
      container.innerHTML = `<div class="cart-empty">Your cart is empty.<br>Start by customizing a frame.</div>`;
    } else {
      container.innerHTML = cart.map((item) => `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-thumb"><img src="${item.photo}" alt="Your uploaded photo"></div>
          <div class="cart-item-info">
            <h3>Custom Photoframe</h3>
            <div class="cart-item-specs">${item.sizeLabel} · ${item.frameName}<br>${item.finishName} · ${item.matName}</div>
            <div class="cart-item-foot">
              <div class="qty-stepper">
                <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
              </div>
              <div class="cart-item-price">${formatINR(item.unitPrice * item.quantity)}</div>
            </div>
            <button type="button" class="remove-item" data-action="remove">Remove</button>
          </div>
        </div>
      `).join("");
    }
  
    container.querySelectorAll(".cart-item").forEach((el) => {
      const id = el.dataset.id;
      el.querySelector('[data-action="inc"]')?.addEventListener("click", () => changeQty(id, 1));
      el.querySelector('[data-action="dec"]')?.addEventListener("click", () => changeQty(id, -1));
      el.querySelector('[data-action="remove"]')?.addEventListener("click", () => removeFromCart(id));
    });
  
    const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    document.getElementById("cartSubtotal").textContent = formatINR(subtotal);
    document.getElementById("checkoutBtn").disabled = cart.length === 0;
  }
  
  function changeQty(id, delta) {
    const cart = Store.getCart();
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.quantity = Math.max(1, item.quantity + delta);
    Store.setCart(cart);
    renderCart();
    updateCartCount();
  }
  
  function removeFromCart(id) {
    const cart = Store.getCart().filter((i) => i.id !== id);
    Store.setCart(cart);
    renderCart();
    updateCartCount();
    showToast("Removed from cart");
  }
  
  function openCart() {
    renderCart();
    document.getElementById("cartDrawer").classList.add("open");
    document.getElementById("cartDrawer").setAttribute("aria-hidden", "false");
    document.getElementById("overlay").classList.add("open");
  }
  
  function closeCart() {
    document.getElementById("cartDrawer").classList.remove("open");
    document.getElementById("cartDrawer").setAttribute("aria-hidden", "true");
    document.getElementById("overlay").classList.remove("open");
  }
  
  function initCartDrawer() {
    document.getElementById("cartToggle")?.addEventListener("click", openCart);
    document.getElementById("mobileCartToggle")?.addEventListener("click", () => {
      document.getElementById("navMobile")?.classList.remove("open");
      document.getElementById("navToggle")?.classList.remove("open");
      openCart();
    });
    document.getElementById("closeCart")?.addEventListener("click", closeCart);
    document.getElementById("overlay")?.addEventListener("click", closeCart);
    document.getElementById("continueShopping")?.addEventListener("click", closeCart);
    document.getElementById("checkoutBtn")?.addEventListener("click", () => {
      if (Store.getCart().length === 0) return;
      closeCart();
      switchView("Checkout");
      renderCheckoutSummary();
    });
  }
  
  /* ============================================================
     CHECKOUT
     ============================================================ */
  function renderCheckoutSummary() {
    const cart = Store.getCart();
    const container = document.getElementById("checkoutSummaryItems");
    if (!container) return;
  
    container.innerHTML = cart.map((item) => `
      <div class="cart-item" style="border-bottom:1px solid var(--line); padding-bottom:16px; margin-bottom:16px;">
        <div class="cart-item-thumb"><img src="${item.photo}" alt="Your uploaded photo"></div>
        <div class="cart-item-info">
          <h3>Custom Photoframe</h3>
          <div class="cart-item-specs">${item.sizeLabel} · ${item.frameName}<br>${item.finishName} · ${item.matName} · Qty ${item.quantity}</div>
        </div>
      </div>
    `).join("");
  
    const productTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = productTotal + (cart.length ? SHIPPING_FEE : 0);
    document.getElementById("coProduct").textContent = formatINR(productTotal);
    document.getElementById("coShipping").textContent = formatINR(cart.length ? SHIPPING_FEE : 0);
    document.getElementById("coTotal").textContent = formatINR(total);
  }
  
  function validateCheckout(formData) {
    const errors = {};
    if (!formData.name.trim()) errors.custName = "Please enter your name.";
    if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, "").slice(-10))) errors.custPhone = "Enter a valid 10-digit phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.custEmail = "Enter a valid email address.";
    if (!formData.address.trim()) errors.custAddress = "Please enter your delivery address.";
    if (!formData.city.trim()) errors.custCity = "Please enter your city.";
    if (!formData.state.trim()) errors.custState = "Please enter your state.";
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode.trim())) errors.custPincode = "Enter a valid 6-digit pincode.";
    return errors;
  }
  
  function initCheckoutForm() {
    document.getElementById("checkoutForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = {
        name: document.getElementById("custName").value, phone: document.getElementById("custPhone").value,
        email: document.getElementById("custEmail").value, address: document.getElementById("custAddress").value,
        city: document.getElementById("custCity").value, state: document.getElementById("custState").value,
        pincode: document.getElementById("custPincode").value,
      };
  
      document.querySelectorAll(".field-error[data-error-for]").forEach((el) => (el.hidden = true));
      const errors = validateCheckout(formData);
      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, msg]) => {
          const el = document.querySelector(`[data-error-for="${field}"]`);
          if (el) { el.textContent = msg; el.hidden = false; }
        });
        document.querySelector(`[data-error-for="${Object.keys(errors)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
  
      const cart = Store.getCart();
      const productTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const shipping = SHIPPING_FEE;
      const total = productTotal + shipping;
  
      const order = {
        orderId: generateOrderId(), customer: formData, items: cart,
        subtotal: productTotal, shipping, total,
        paymentStatus: "pending", orderStatus: "awaiting_payment", createdAt: new Date().toISOString(),
      };
  
      Store.setOrder(order);
      switchView("Payment");
      renderPayment();
    });
  }
  
  /* ============================================================
     PAYMENT — Razorpay Standard Checkout
     Flow: Pay Now -> POST /create-order (server prices + creates
     the Razorpay order) -> Razorpay Checkout collects payment ->
     POST /verify-payment (server verifies the signature) -> only
     on a verified server response do we advance to Confirmation.
     The frontend never marks an order as paid on its own.
     ============================================================ */
  const RAZORPAY_FN_BASE = "/.netlify/functions";
  let payInFlight = false; // guards against rapid/duplicate Pay Now clicks

  function initPaymentPage() {
    document.getElementById("payNowBtn")?.addEventListener("click", handlePayNow);
  }

  function renderPayment() {
    const order = Store.getOrder();
    if (!order) return;
    document.getElementById("paymentAmount").textContent = formatINR(order.total);
    document.getElementById("paymentOrderRef").textContent = order.orderId;
    setPaymentState("idle");
  }

  /* idle | loading | cancelled | failed — "success" is not a state
     the customer waits in; a verified payment moves straight to
     the Confirmation view. */
  function setPaymentState(state, message) {
    const banner = document.getElementById("statusBanner");
    const payBtn = document.getElementById("payNowBtn");
    banner.classList.remove("submitted", "success", "failed", "show");

    switch (state) {
      case "loading":
        banner.textContent = message || "Contacting payment gateway…";
        banner.classList.add("submitted", "show");
        payBtn.disabled = true; payBtn.textContent = "Please wait…";
        break;
      case "cancelled":
        banner.textContent = message || "Payment was cancelled. You haven't been charged — you can try again.";
        banner.classList.add("failed", "show");
        payBtn.disabled = false; payBtn.textContent = "Pay Now";
        break;
      case "failed":
        banner.textContent = message || "We couldn't confirm this payment. Please try again.";
        banner.classList.add("failed", "show");
        payBtn.disabled = false; payBtn.textContent = "Pay Now";
        break;
      default:
        payBtn.disabled = false; payBtn.textContent = "Pay Now";
    }
  }

  function loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SCRIPT}"]`);
      if (existing) { existing.addEventListener("load", () => resolve()); existing.addEventListener("error", () => reject()); return; }
      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_SCRIPT;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
  }

  async function handlePayNow() {
    if (payInFlight) return; // prevent duplicate order creation from rapid clicks
    const order = Store.getOrder();
    if (!order) return;

    payInFlight = true;
    setPaymentState("loading", "Preparing secure checkout…");

    try {
      await loadRazorpayScript();

      const createRes = await fetch(`${RAZORPAY_FN_BASE}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderRef: order.orderId,
          items: order.items.map((i) => ({ sizeId: i.sizeId, frameId: i.frameId, finishId: i.finishId, matId: i.matId, quantity: i.quantity })),
          customer: { name: order.customer.name, email: order.customer.email, phone: order.customer.phone },
        }),
      });

      if (!createRes.ok) {
        const err = await safeJson(createRes);
        throw new Error(err?.error || "Couldn't start the payment. Please try again.");
      }
      const { keyId, razorpayOrderId, amount, currency, orderRef } = await createRes.json();

      payInFlight = false; // Razorpay Checkout has its own UI lock from here

      const rzp = new window.Razorpay({
        key: keyId,
        order_id: razorpayOrderId,
        amount, currency,
        name: "VK Photography",
        description: "Personalized Photoframe Order",
        prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone },
        theme: { color: "#2b2620" },
        modal: {
          ondismiss: () => setPaymentState("cancelled"),
        },
        handler: (response) => verifyAndConfirm(response, orderRef),
      });

      rzp.on("payment.failed", () => {
        setPaymentState("failed", "Your payment didn't go through. Please try again or use a different payment method.");
      });

      setPaymentState("idle");
      rzp.open();
    } catch (err) {
      payInFlight = false;
      setPaymentState("failed", err.message || "Something went wrong starting the payment. Please try again.");
    }
  }

  async function verifyAndConfirm(razorpayResponse, orderRef) {
    setPaymentState("loading", "Verifying your payment…");
    try {
      const verifyRes = await fetch(`${RAZORPAY_FN_BASE}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          orderRef,
        }),
      });

      const result = await safeJson(verifyRes);
      if (!verifyRes.ok || !result?.verified) {
        setPaymentState("failed", "We couldn't verify this payment. If money was deducted, it will be refunded automatically — please try again.");
        return;
      }

      // Only a successful server-side verification updates the order.
      const order = Store.getOrder();
      if (!order) return;
      order.paymentStatus = "paid";
      order.orderStatus = "confirmed";
      order.razorpayOrderId = result.razorpayOrderId;
      order.razorpayPaymentId = result.razorpayPaymentId;
      Store.setOrder(order);

      switchView("Confirmation");
      showConfirmation();
    } catch (err) {
      setPaymentState("failed", "We couldn't verify this payment due to a network error. Please try again.");
    }
  }

  async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
  }
  
  /* ============================================================
     CONFIRMATION
     ============================================================ */
  function showConfirmation() {
    const order = Store.getOrder();
    if (!order || order.paymentStatus !== "paid") return;
  
    document.getElementById("orderIdLine").textContent = `Order #${order.orderId}`;
  
    document.getElementById("confirmItems").innerHTML = order.items.map((item) => `
      <div class="confirm-card">
        <div class="confirm-card-top">
          <div class="confirm-photo"><img src="${item.photo}" alt="Your uploaded photo"></div>
          <div class="confirm-specs">
            <h3>Custom Photoframe</h3>
            <p>${item.sizeLabel} · ${item.frameName}<br>${item.finishName} · ${item.matName} · Qty ${item.quantity}</p>
          </div>
        </div>
      </div>
    `).join("");
  
    document.getElementById("orderTotals").innerHTML = `
      <div class="confirm-meta-row"><span>Product</span><span>${formatINR(order.subtotal)}</span></div>
      <div class="confirm-meta-row"><span>Shipping</span><span>${formatINR(order.shipping)}</span></div>
      <div class="confirm-meta-row total"><span>Amount Paid</span><span>${formatINR(order.total)}</span></div>
    `;
  
    const trackBtn = document.getElementById("trackOrderBtn");
    trackBtn.onclick = (e) => { e.preventDefault(); showToast(`Order ${order.orderId} is being prepared — we'll email tracking details soon.`); };
  
    document.getElementById("continueShoppingBtn")?.addEventListener("click", (e) => {
      e.preventDefault();
      Store.setCart([]);
      updateCartCount();
      switchView("Shop");
    });
  
    Store.setCart([]);
    updateCartCount();
  }
  
  /* ============================================================
     UTILITIES
     ============================================================ */
  function formatINR(amount) { return "₹" + Math.round(amount).toLocaleString("en-IN"); }
  function generateOrderId() { const n = Math.floor(1000 + Math.random() * 9000); return `VK${n}`; }
  function showFieldError(el, message) { if (!el) return; el.textContent = message; el.hidden = false; }
  
  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }