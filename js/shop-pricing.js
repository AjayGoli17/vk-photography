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
     basePrice does not change with orientation. */
  const SIZES = [
    { id: "5x7", label: "5 × 7\"", note: "Desk frame", basePrice: 999, aspectRatio: 5 / 7, minResolution: { w: 750, h: 1050 } },
    { id: "8x10", label: "8 × 10\"", note: "Most popular", basePrice: 1499, aspectRatio: 8 / 10, minResolution: { w: 1200, h: 1500 } },
    { id: "8x12", label: "8 × 12\"", note: "A4-ish", basePrice: 1799, aspectRatio: 8 / 12, minResolution: { w: 1200, h: 1800 } },
    { id: "12x16", label: "12 × 16\"", note: "Wall frame", basePrice: 2499, aspectRatio: 12 / 16, minResolution: { w: 1800, h: 2400 } },
    { id: "12x18", label: "12 × 18\"", note: "Wall frame", basePrice: 2999, aspectRatio: 12 / 18, minResolution: { w: 1800, h: 2700 } },
    { id: "16x20", label: "16 × 20\"", note: "Large wall", basePrice: 3999, aspectRatio: 16 / 20, minResolution: { w: 2400, h: 3000 } },
    { id: "20x24", label: "20 × 24\"", note: "Statement piece", basePrice: 4999, aspectRatio: 20 / 24, minResolution: { w: 3000, h: 3600 } },
  ];

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
     ids. Returns null if any id is invalid so callers can reject
     the request instead of silently pricing it at 0. */
  function getUnitPrice({ sizeId, frameId, finishId, matId }) {
    const size = SIZES.find((s) => s.id === sizeId);
    const frame = FRAMES.find((f) => f.id === frameId);
    const finish = FINISHES.find((f) => f.id === finishId);
    const mat = MATS.find((m) => m.id === matId);
    if (!size || !frame || !finish || !mat) return null;
    return size.basePrice + frame.priceModifier + finish.priceModifier + mat.priceModifier;
  }

  return { FRAMES, SIZES, ORIENTATIONS, FINISHES, MATS, SHIPPING_FEE, CURRENCY, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER, getUnitPrice };
});
