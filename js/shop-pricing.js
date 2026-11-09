/* ============================================================
   VK PHOTOGRAPHY — SHARED PRODUCT / PRICING CONFIG
   Single source of truth for frame, size, quality and mounting prices.

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
    /* FRAME COLLECTION - one entry per frame photographed in /frames.
       To add a frame: drop two images in /frames (<id>.webp = 640x800 card photo,
       <id>-swatch.webp = small border texture for the live preview) and add one
       entry below. Nothing else needs to change.

       priceModifier = what this frame adds on top of the print price.
       !! The numbers below are PLACEHOLDERS - set your real prices here. !!
       (The server re-prices every order from this file, so this is the only place.) */
    const FRAMES = [
      { id: "brick-brown", name: "Classic Brown", description: "Dark brown frame with a thin gold line inside. Simple and timeless.", priceModifier: 100, image: "frames/brick-brown.webp", swatch: "frames/brick-brown-swatch.webp", swatchColor: "#54443f" },
      { id: "mahogany", name: "Polished Wood", description: "Glossy reddish-brown wood finish with a black inner edge. Classic and elegant.", priceModifier: 0, image: "frames/mahogany.webp", swatch: "frames/mahogany-swatch.webp", swatchColor: "#5e4a48" },
      { id: "grey-modern", name: "Modern Grey", description: "Flat, smooth grey frame with a slim black edge. Clean and contemporary.", priceModifier: 0, image: "frames/grey-modern.webp", swatch: "frames/grey-modern-swatch.webp", swatchColor: "#807f84" },
      { id: "red-lattice", name: "Red Diamond", description: "Warm red-brown frame with a raised diamond pattern.", priceModifier: 150, image: "frames/red-lattice.webp", swatch: "frames/red-lattice-swatch.webp", swatchColor: "#6a4135" },
      { id: "burgundy-hex", name: "Wine Red", description: "Deep wine-red frame with a fine dotted texture.", priceModifier: 150, image: "frames/burgundy-hex.webp", swatch: "frames/burgundy-hex-swatch.webp", swatchColor: "#563c3c" },
      { id: "gold-rope", name: "Royal Gold", description: "Dark wine frame with a twisted gold rope edge. A great pick for weddings and festive gifts.", priceModifier: 300, image: "frames/gold-rope.webp", swatch: "frames/gold-rope-swatch.webp", swatchColor: "#7b5b47" },
      { id: "copper-quilt", name: "Copper Glow", description: "Shiny copper-coloured frame with a soft, cushioned diamond look.", priceModifier: 200, image: "frames/copper-quilt.webp", swatch: "frames/copper-quilt-swatch.webp", swatchColor: "#784836" },
      { id: "basket-weave", name: "Woven Brown", description: "Rich brown frame with a woven, tile-like texture.", priceModifier: 200, image: "frames/basket-weave.webp", swatch: "frames/basket-weave-swatch.webp", swatchColor: "#5e3a2f" },
      { id: "onyx-lattice", name: "Black Diamond", description: "Black frame with a raised diamond pattern and a silver edge. Bold and stylish.", priceModifier: 200, image: "frames/onyx-lattice.webp", swatch: "frames/onyx-lattice-swatch.webp", swatchColor: "#3a3a3c" },
      { id: "bamboo-rope", name: "Natural Bamboo", description: "Dark brown frame with a ribbed, bamboo-like texture.", priceModifier: 250, image: "frames/bamboo-rope.webp", swatch: "frames/bamboo-rope-swatch.webp", swatchColor: "#63473f" },
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
  "4x6": { normal: 159, premium: 329 },
  "5x7": { normal: 149, premium: 299 },
  "6x8": { normal: 299, premium: 499 },
  "6x9": { normal: 299, premium: 499 },
  "8x10": { normal: 399, premium: 549 },
  "8x12": { normal: 399, premium: 649 },
  "10x12": { normal: 699, premium: 999 },
  "12x15": { normal: 899, premium: 1199 },
      "10x15": { normal: null, premium: null },
  "12x18": { normal: 1199, premium: 1599 },
  "16x20": { normal: 1399, premium: 1999 },
  "16x24": { normal: 1899, premium: 2599 },
      "24x40": { normal: null, premium: null },
  "20x24": { normal: 1599, premium: 2499 },
  "20x30": { normal: 2199, premium: 2999 },
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
  
    const MOUNTINGS = [
      { id: "without-mounting", name: "Without Mounting", sub: "Print only, no mounting board", priceModifier: 0 },
      { id: "with-mounting", name: "With Mounting", sub: "Mounted on board, ready to display", priceModifier: 300 },
    ];
  
  
    /* Photo gifts: fixed-price products printed with one customer photo.
       No size / frame / mat options — the price is just "price".
       image: product shot shown on the shop card.
       minResolution: smallest photo (px) that prints sharply. */
    const PRODUCTS = [
      {
        id: "photo-mug", name: "Photo Mug", pageTitle: "Create your photo mug", price: 299,
        image: "gifts/photo-mug.jpg",
        description: "A white mug with your favorite photo printed on the front.",
        note: "Printed on the front of the mug, opposite the handle side. Drag and zoom to choose which part of your photo shows.",
        tip: "Close-up photos in good light print best.",
        minResolution: { w: 900, h: 900 },
      },
      {
        id: "heart-pillow", name: "Heart Pillow", pageTitle: "Create your heart pillow", price: 399,
        image: "gifts/heart-pillow.jpg",
        description: "A soft, fluffy red heart pillow with your photo set into the center.",
        note: "Your photo is printed inside the heart, framed by the fluffy red edge. Drag and zoom to center the faces.",
        tip: "Keep faces near the middle so the heart shape doesn't crop them.",
        minResolution: { w: 1000, h: 1000 },
      },
      {
        id: "magic-pillow", name: "Personalized Magic Pillow", pageTitle: "Create your magic pillow", price: 899,
        image: "gifts/magic-pillow.jpg",
        description: "A silver sequin cushion. Brush the sequins to reveal your photo.",
        note: "Brush the sequins one way to reveal your photo and the other way to hide it. Drag and zoom to choose what shows in the oval.",
        tip: "Bright, high-contrast photos look best through sequins.",
        minResolution: { w: 1000, h: 1200 },
      },
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
    function getUnitPrice({ sizeId, qualityId, frameId, mountingId }) {
      const size = SIZES.find((s) => s.id === sizeId);
      const quality = QUALITIES.find((q) => q.id === qualityId);
      const frame = FRAMES.find((f) => f.id === frameId);
      const mounting = MOUNTINGS.find((m) => m.id === mountingId);
      if (!size || !quality || !frame || !mounting) return null;
      const printPrice = getPrintPrice(sizeId, qualityId);
      if (printPrice == null) return null;
      return printPrice + frame.priceModifier + mounting.priceModifier;
    }
  
    /* Server-trusted unit price for a photo gift, or null if the id
       isn't in the catalog. */
    function getProductPrice(productId) {
      const product = PRODUCTS.find((p) => p.id === productId);
      return product ? product.price : null;
    }
  
    /* One entry point for any cart line: gifts are identified by
       productId, frames by their option ids (incl. qualityId).
       Returns null if invalid. */
    function getItemUnitPrice(item) {
      if (!item || typeof item !== "object") return null;
      if (item.productId !== undefined) return getProductPrice(item.productId);
      return getUnitPrice(item);
    }
  
    return {
      FRAMES, SIZES, ORIENTATIONS, MOUNTINGS, QUALITIES, PRINT_PRICES, PRODUCTS,
      SHIPPING_FEE, CURRENCY, MAX_QTY_PER_ITEM, MAX_ITEMS_PER_ORDER,
      getPrintPrice, getUnitPrice, getProductPrice, getItemUnitPrice,
    };
  });