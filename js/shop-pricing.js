/* ============================================================
   VK PHOTOGRAPHY — SHARED PRODUCT / PRICING CONFIG
   Single source of truth for frame, size, finish and mat prices.

   Used by:
     - js/shop.js (browser)               -> window.VKPricing
     - netlify/functions/create-order.js  -> require("../../js/shop-pricing.js")

   IMPORTANT: this file is loaded both as a plain <script> in the
   browser and with require() in a Node (Netlify Function) context.
   Keep it dependency-free and CommonJS/UMD-safe.

   Prices here are what the server trusts. The browser only uses
   them to render the UI — the server always recalculates the
   order total from these values, never from anything the client
   sends over the wire.
   ------------------------------------------------------------ */
   (function (root, factory) {
    if (typeof module === "object" && module.exports) {
      module.exports = factory();
    } else {
      root.VKPricing = factory();
    }
  })(typeof self !== "undefined" ? self : this, function () {
    const FRAMES = [
      { id: "classic-black", name: "Classic Black", description: "A timeless matte-black frame that suits any photo, any room.", basePrice: 1499, priceModifier: 0 },
      { id: "natural-wood", name: "Natural Wood", description: "Warm, honest wood grain — a favorite for portraits and family photos.", basePrice: 1699, priceModifier: 200 },
      { id: "white-gallery", name: "White Gallery", description: "Clean gallery-white edges that let bright, airy photos breathe.", basePrice: 1599, priceModifier: 100 },
      { id: "premium-walnut", name: "Premium Walnut", description: "Deep walnut tones with a refined finish, for your most cherished shot.", basePrice: 1999, priceModifier: 500 },
    ];
  
    /* Standard sizes as sold by Indian photoframe/print shops.
       Each size is listed the conventional way — smaller number
       first — and the Orientation control determines whether it's
       mounted upright (Portrait) or on its side (Landscape).
  
       NOTE: sizes no longer carry their own basePrice. Pricing for
       a size now depends on which Print Quality (Normal / Premium)
       the customer also picks — see PRINT_PRICES below. minResolution
       is just the recommended-DPI guide used for the on-page quality
       warning and is unrelated to pricing. */
    const SIZES = [
      { id: "4x6", label: "4 × 6\"", aspectRatio: 4 / 6, minResolution: { w: 600, h: 900 } },
      { id: "5x7", label: "5 × 7\"", aspectRatio: 5 / 7, minResolution: { w: 750, h: 1050 } },
      { id: "6x8", label: "6 × 8\"", aspectRatio: 6 / 8, minResolution: { w: 900, h: 1200 } },
      { id: "6x9", label: "6 × 9\"", aspectRatio: 6 / 9, minResolution: { w: 900, h: 1350 } },
      { id: "8x10", label: "8 × 10\"", aspectRatio: 8 / 10, minResolution: { w: 1200, h: 1500 } },
      { id: "8x12", label: "8 × 12\"", aspectRatio: 8 / 12, minResolution: { w: 1200, h: 1800 } },
      { id: "10x12", label: "10 × 12\"", aspectRatio: 10 / 12, minResolution: { w: 1500, h: 1800 } },
      { id: "12x15", label: "12 × 15\"", aspectRatio: 12 / 15, minResolution: { w: 1800, h: 2250 } },
      { id: "10x15", label: "10 × 15\"", aspectRatio: 10 / 15, minResolution: { w: 1500, h: 2250 } },
      { id: "12x18", label: "12 × 18\"", aspectRatio: 12 / 18, minResolution: { w: 1800, h: 2700 } },
      { id: "16x20", label: "16 × 20\"", aspectRatio: 16 / 20, minResolution: { w: 2400, h: 3000 } },
      { id: "16x24", label: "16 × 24\"", aspectRatio: 16 / 24, minResolution: { w: 2400, h: 3600 } },
      { id: "24x40", label: "24 × 40\"", aspectRatio: 24 / 40, minResolution: { w: 3600, h: 6000 } },
      { id: "20x24", label: "20 × 24\"", aspectRatio: 20 / 24, minResolution: { w: 3000, h: 3600 } },
      { id: "20x30", label: "20 × 30\"", aspectRatio: 20 / 30, minResolution: { w: 3000, h: 4500 } },
    ];
  
    /* Print Quality options — chosen alongside Size, before Frame
       Style. No price is ever shown on these two cards; the price
       they resolve to (via PRINT_PRICES below) only shows up once
       it's combined with a size in the order summary. */
    const QUALITIES = [
      { id: "normal", name: "Normal Quality", description: "Standard high-quality photo print" },
      { id: "premium", name: "Premium Quality", description: "Enhanced premium photo print quality" },
    ];
  
    /* ------------------------------------------------------------
       CENTRALIZED SIZE + QUALITY PRICING
       Single place to add/update Normal & Premium print prices for
       every size. Only 4×6 is confirmed right now — every other
       size is intentionally left as `null` (not 0) so the UI can
       tell "not priced yet" apart from "free". Fill in real prices
       here as the client confirms them; nothing else needs to change.
       ------------------------------------------------------------ */
    const PRINT_PRICES = {
      "4x6": { normal: 100, premium: 159 },
      "5x7": { normal: null, premium: null },
      "6x8": { normal: null, premium: null },
      "6x9": { normal: null, premium: null },
      "8x10": { normal: null, premium: null },
      "8x12": { normal: null, premium: null },
      "10x12": { normal: null, premium: null },
      "12x15": { normal: null, premium: null },
      "10x15": { normal: null, premium: null },
      "12x18": { normal: null, premium: null },
      "16x20": { normal: null, premium: null },
      "16x24": { normal: null, premium: null },
      "24x40": { normal: null, premium: null },
      "20x24": { normal: null, premium: null },
      "20x30": { normal: null, premium: null },
    };
  
    /* Looks up the confirmed print price for a size + quality pair.
       Returns null (never 0) when that combination hasn't been
       priced yet — callers must treat null as "unavailable", not
       "free". */
    function getPrintPrice(sizeId, qualityId) {
      const entry = PRINT_PRICES[sizeId];
      if (!entry) return null;
      const price = entry[qualityId];
      return typeof price === "number" ? price : null;
    }
  
    const ORIENTATIONS = [
      { id: "portrait", name: "Portrait", sub: "Taller than wide" },
      { id: "landscape", name: "Landscape", sub: "Wider than tall" },
    ];
  
    const FINISHES = [
      { id: "matte", name: "Matte", priceModifier: 0 },
      { id: "glossy", name: "Glossy", priceModifier: 150 },
    ];
  
    const MATS = [
      { id: "no-mat", name: "No Mat", priceModifier: 0 },
      { id: "white-mat", name: "White Mat", priceModifier: 300 },
    ];
  
    const SHIPPING_FEE = 199;
    const CURRENCY = "INR";
    const MAX_QTY_PER_ITEM = 20;
    const MAX_ITEMS_PER_ORDER = 20;
  
    /* Server-trusted unit price for one item, given selected option
       ids (now including qualityId). Returns null if any id is
       invalid OR if that size+quality combination has no confirmed
       price yet in PRINT_PRICES — callers must reject the request
       instead of silently pricing it at 0. */
    function getUnitPrice({ sizeId, qualityId, frameId, finishId, matId }) {
      const size = SIZES.find((s) => s.id === sizeId);
      const quality = QUALITIES.find((q) => q.id === qualityId);
      const frame = FRAMES.find((f) => f.id === frameId);
      const finish = FINISHES.find((f) => f.id === finishId);
      const mat = MATS.find((m) => m.id === matId);
      if (!size || !quality || !frame || !finish || !mat) return null;
      const printPrice = getPrintPrice(sizeId, qualityId);
      if (printPrice == null) return null;
      return printPrice + frame.priceModifier + finish.priceModifier + mat.priceModifier;
    }
  
    return {
      FRAMES, SIZES, ORIENTATIONS, FINISHES, MATS, QUALITIES, PRINT_PRICES,
      SHIPPING_FEE, CURRENCY, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER,
      getPrintPrice, getUnitPrice,
    };
  });