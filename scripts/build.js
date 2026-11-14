#!/usr/bin/env node
/* VK Photography - production build.  Usage: node scripts/build.js
 *
 * Reads the hand-written site in public/ and writes an optimised copy to dist/ (what Netlify publishes).
 * public/ is never modified, so you keep editing small, readable files.
 *
 *  1. CSS    : every page's local <link rel="stylesheet"> files are merged (in the same order), minified and
 *              written as ONE file  ->  /assets/<page>.<hash>.css
 *  2. JS     : every local <script src> is copied to /assets/<name>.<hash>.js
 *  3. Cache  : the hash comes from the file CONTENT, so a changed file gets a new URL automatically.
 *              No more ?v=2 by hand, and /assets/* can safely be cached for a year (see netlify.toml).
 *  4. Images : any <img> without width/height gets the real size read from the file, so the browser
 *              reserves the space before the image loads (no layout jump).
 *
 * No npm packages needed. Node 18+.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "public");
const OUT = path.join(ROOT, "dist");
const ASSETS = path.join(OUT, "assets");

const warnings = [];
const warn = (m) => warnings.push(m);
const hash = (buf) => crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8);
const isRemote = (u) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u);

/* ---------- image size readers (PNG / JPEG incl. EXIF rotation / WebP / GIF) ---------- */
function jpegSize(b) {
  let o = 2, orient = 1, size = null;
  while (o + 4 < b.length) {
    if (b[o] !== 0xff) { o++; continue; }
    const m = b[o + 1];
    if (m === 0xff) { o++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { o += 2; continue; }
    const len = b.readUInt16BE(o + 2);
    if (m === 0xe1 && b.toString("latin1", o + 4, o + 8) === "Exif") {
      const t = o + 10, le = b.toString("latin1", t, t + 2) === "II";
      const u16 = (p) => (le ? b.readUInt16LE(p) : b.readUInt16BE(p));
      const u32 = (p) => (le ? b.readUInt32LE(p) : b.readUInt32BE(p));
      const ifd = t + u32(t + 4), n = u16(ifd);
      for (let i = 0; i < n; i++) if (u16(ifd + 2 + i * 12) === 0x0112) orient = u16(ifd + 2 + i * 12 + 8);
    }
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(m)) {
      size = [b.readUInt16BE(o + 7), b.readUInt16BE(o + 5)];
      break;
    }
    o += 2 + len;
  }
  if (!size) return null;
  return orient >= 5 && orient <= 8 ? [size[1], size[0]] : size; // browsers display EXIF-rotated
}
function webpSize(b) {
  const kind = b.toString("latin1", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  return null;
}
function imageSize(file) {
  const b = fs.readFileSync(file);
  if (b.length > 24 && b.toString("latin1", 1, 4) === "PNG") return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) return jpegSize(b);
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return webpSize(b);
  if (b.toString("latin1", 0, 3) === "GIF") return [b.readUInt16LE(6), b.readUInt16LE(8)];
  return null;
}

/* ---------- CSS: minify + make url() paths root-relative so the bundle can live in /assets ---------- */
function processCss(css, cssUrlDir) {
  let out = "", i = 0, q = null, ws = false;
  const n = css.length;
  const emitWs = () => { if (ws) { if (!/[{};,]$/.test(out) && out) out += " "; ws = false; } };
  while (i < n) {
    const c = css[i];
    if (q) { out += c; if (c === "\\") out += css[++i] || ""; else if (c === q) q = null; i++; continue; }
    if (c === "/" && css[i + 1] === "*") { const e = css.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; continue; }
    if (/\s/.test(c)) { ws = true; i++; continue; }
    if (/url\(/i.test(css.substr(i, 4))) {                // keep url(...) opaque, fix relative paths
      emitWs();
      let j = i + 4, depth = 1, qq = null;
      while (j < n && depth) {
        const d = css[j];
        if (qq) { if (d === "\\") j++; else if (d === qq) qq = null; }
        else if (d === '"' || d === "'") qq = d;
        else if (d === "(") depth++;
        else if (d === ")") depth--;
        j++;
      }
      let inner = css.slice(i + 4, j - 1).trim();
      const quote = /^["']/.test(inner) ? inner[0] : "";
      if (quote) inner = inner.slice(1, -1);
      if (!/^(?:data:|#|\/|[a-z][a-z0-9+.-]*:)/i.test(inner)) {
        const [p, rest = ""] = inner.split(/([?#].*)$/);
        inner = path.posix.normalize(path.posix.join(cssUrlDir, p)) + rest;
        if (!inner.startsWith("/")) inner = "/" + inner;
      }
      out += 'url(' + (quote || (/[\s()'"]/.test(inner) ? '"' : "")) + inner + (quote || (/[\s()'"]/.test(inner) ? '"' : "")) + ")";
      i = j; continue;
    }
    if (c === '"' || c === "'") { emitWs(); q = c; out += c; i++; continue; }
    if (/[{};,]/.test(c)) { ws = false; out += c; i++; continue; }
    emitWs(); out += c; i++;
  }
  return out.replace(/;}/g, "}").replace(/\{\s+/g, "{");
}

/* ---------- start ---------- */
if (!fs.existsSync(path.join(SRC, "index.html"))) { console.error("public/index.html not found. Run from the project root."); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true });
fs.mkdirSync(ASSETS, { recursive: true });

const jsCache = new Map();       // original rel path -> hashed url
const hashedOriginals = new Set();
function hashedJs(rel) {
  if (jsCache.has(rel)) return jsCache.get(rel);
  const file = path.join(SRC, rel);
  if (!fs.existsSync(file)) { warn(`script not found: ${rel}`); jsCache.set(rel, null); return null; }
  const buf = fs.readFileSync(file);
  const base = path.basename(rel, ".js");
  const name = `${base}.${hash(buf)}.js`;
  fs.writeFileSync(path.join(ASSETS, name), buf);
  hashedOriginals.add(rel);
  const url = "/assets/" + name;
  jsCache.set(rel, url);
  return url;
}

const IMG_RE = /<img\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
const TAG_LINK = /<link\b(?:"[^"]*"|'[^']*'|[^'">])*>\s*?\r?\n?/gi;
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i")); return m ? (m[1] ?? m[2] ?? m[3]) : null; };
const report = [];

for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith(".html"))) {
  const page = path.basename(file, ".html");
  let html = fs.readFileSync(path.join(OUT, file), "utf8");
  const stat = { page: file, cssBefore: 0, cssAfter: 0, js: 0, imgs: 0 };

  // 1) CSS bundle
  const cssFiles = []; let firstAt = -1, idx = 0;
  html = html.replace(TAG_LINK, (tag) => {
    const rel = (attr(tag, "rel") || "").toLowerCase(), href = attr(tag, "href");
    if (rel !== "stylesheet" || !href || isRemote(href) || attr(tag, "media")) { idx++; return tag; }
    const clean = href.split(/[?#]/)[0].replace(/^\//, "");
    if (!fs.existsSync(path.join(SRC, clean))) { warn(`${file}: stylesheet not found: ${href}`); idx++; return tag; }
    cssFiles.push(clean);
    if (firstAt < 0) { firstAt = idx; return "\u0000BUNDLE\u0000"; }
    idx++;
    return "";
  });
  stat.cssBefore = cssFiles.length;
  if (cssFiles.length) {
    let css = ":where(img[width][height]){height:auto}";   // zero-specificity: lets width/height reserve space without distorting
    for (const f of cssFiles) css += processCss(fs.readFileSync(path.join(SRC, f), "utf8"), path.posix.dirname("/" + f.replace(/\\/g, "/")));
    const name = `${page}.${hash(css)}.css`;
    fs.writeFileSync(path.join(ASSETS, name), css);
    cssFiles.forEach((f) => hashedOriginals.add(f));
    html = html.replace("\u0000BUNDLE\u0000", `<link rel="stylesheet" href="/assets/${name}">\n`);
    stat.cssAfter = 1;
  }

  // 2) JS hashing
  html = html.replace(/(<script\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi, (all, pre, q, src) => {
    if (isRemote(src)) return all;
    const rel = src.split(/[?#]/)[0].replace(/^\//, "");
    const url = hashedJs(rel);
    if (!url) return all;
    stat.js++;
    return `${pre}${q}${url}${q}`;
  });

  // 3) <img> width/height
  html = html.replace(IMG_RE, (tag) => {
    const hasW = attr(tag, "width") !== null, hasH = attr(tag, "height") !== null;
    if (hasW && hasH) return tag;
    const src = attr(tag, "src");
    if (!src || isRemote(src) || src.includes("${")) return tag;
    const rel = decodeURI(src.split(/[?#]/)[0]);
    const f = rel.startsWith("/") ? path.join(SRC, rel) : path.join(SRC, rel);
    if (!fs.existsSync(f)) { warn(`${file}: image file missing: ${src}`); return tag; }
    if (hasW || hasH) { warn(`${file}: ${src} has only one of width/height, left alone`); return tag; }
    let size = null;
    try { size = imageSize(f); } catch (e) { /* fall through */ }
    if (!size) { warn(`${file}: could not read size of ${src}`); return tag; }
    stat.imgs++;
    return tag.replace(/<img\b/i, `<img width="${size[0]}" height="${size[1]}"`);
  });

  fs.writeFileSync(path.join(OUT, file), html);
  report.push(stat);
}

// remove the un-hashed originals from dist so nothing can be served stale
for (const rel of hashedOriginals) fs.rmSync(path.join(OUT, rel), { force: true });
for (const d of ["css", "js/vendor", "js"]) { const p = path.join(OUT, d); if (fs.existsSync(p) && !fs.readdirSync(p).length) fs.rmdirSync(p); }

// verify: every local file a built page points at must exist
for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(OUT, file), "utf8");
  for (const m of html.matchAll(/\b(?:href|src)\s*=\s*"(\/?(?:assets|fonts)\/[^"?#]+)"/g)) {
    if (!fs.existsSync(path.join(OUT, m[1]))) warn(`${file}: points at ${m[1]} which does not exist in dist/`);
  }
  if (/fonts\.(?:googleapis|gstatic)\.com/.test(html)) warn(`${file}: still references Google Fonts`);
}

console.log("\nBuild finished -> dist/\n");
console.log("page".padEnd(22) + "CSS files".padEnd(14) + "JS hashed".padEnd(12) + "img sizes added");
for (const r of report) console.log(r.page.padEnd(22) + `${r.cssBefore} -> ${r.cssAfter}`.padEnd(14) + String(r.js).padEnd(12) + r.imgs);
if (warnings.length) { console.log("\nWarnings:"); [...new Set(warnings)].forEach((w) => console.log("  - " + w)); }
console.log("");
