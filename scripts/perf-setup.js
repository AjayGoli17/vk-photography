#!/usr/bin/env node
/* One-time setup (safe to re-run). Usage: node scripts/perf-setup.js
 *
 *  - Downloads the site's fonts from npm (@fontsource) and self-hosts them in public/fonts/
 *    -> removes every request to fonts.googleapis.com / fonts.gstatic.com
 *    -> only the families the site really uses (drops Bebas Neue, Jost, Plus Jakarta Sans, Roboto Mono, Material Symbols)
 *    -> latin + latin-ext only (latin-ext is needed for the rupee sign), loaded on demand via unicode-range
 *  - Writes public/css/fonts.css and points every page at it (+ one <link rel=preload> for the body font)
 *  - Removes hand-written ?v=N from local css/js links (scripts/build.js now fingerprints files)
 *  - Updates netlify.toml (publish = dist, build command, cache headers, tighter CSP), package.json, .gitignore
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PUB = path.join(ROOT, "public");
const log = (m) => console.log(m);

if (!fs.existsSync(path.join(PUB, "index.html")) || !fs.existsSync(path.join(ROOT, "netlify.toml"))) {
  console.error("Run this from the project root (needs public/index.html and netlify.toml).");
  process.exit(1);
}

/* ---------- 0. backup ---------- */
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const BK = path.join(ROOT, ".perf-backup-" + stamp);
function backup(rel) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) return;
  const to = path.join(BK, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
fs.readdirSync(PUB).filter((f) => f.endsWith(".html")).forEach((f) => backup("public/" + f));
["netlify.toml", "package.json", ".gitignore"].forEach(backup);
log(`Backup of files about to change: ${path.relative(ROOT, BK)}/`);

/* ---------- 1. fonts ---------- */
const V = "5.3.0"; // pinned so the result is reproducible
const SPECS = [
  { pkg: "@fontsource-variable/fraunces", family: "Fraunces", css: ["opsz.css", "opsz-italic.css"] },
  { pkg: "@fontsource-variable/inter", family: "Inter", css: ["wght.css"] },
  { pkg: "@fontsource-variable/manrope", family: "Manrope", css: ["wght.css"] },
  { pkg: "@fontsource-variable/cormorant-garamond", family: "Cormorant Garamond", css: ["wght.css", "wght-italic.css"] },
  { pkg: "@fontsource-variable/playfair-display", family: "Playfair Display", css: ["wght.css", "wght-italic.css"] },
  { pkg: "@fontsource-variable/montserrat", family: "Montserrat", css: ["wght.css"] },
  { pkg: "@fontsource/space-mono", family: "Space Mono", css: ["400.css", "700.css"] },
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vk-fonts-"));
fs.writeFileSync(path.join(tmp, "package.json"), '{"name":"tmp","private":true}');
log("Downloading fonts from npm (@fontsource)...");
try {
  execFileSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "--no-audit", "--no-fund", "--loglevel=error", ...SPECS.map((s) => `${s.pkg}@${V}`)],
    { cwd: tmp, stdio: "inherit", shell: process.platform === "win32" }
  );
} catch (e) {
  console.error("\nCould not download fonts (is npm online?). Nothing has been changed except the backup folder.");
  process.exit(1);
}

const FONT_DIR = path.join(PUB, "fonts");
fs.mkdirSync(FONT_DIR, { recursive: true });
fs.readdirSync(FONT_DIR).filter((f) => f.endsWith(".woff2")).forEach((f) => fs.rmSync(path.join(FONT_DIR, f)));

const faces = [];
const fileFor = {}; // "Inter|latin|normal" -> filename (for preload)
for (const s of SPECS) {
  const dir = path.join(tmp, "node_modules", s.pkg);
  for (const cssName of s.css) {
    const css = fs.readFileSync(path.join(dir, cssName), "utf8");
    for (const block of css.match(/@font-face\s*\{[^}]*\}/g) || []) {
      const src = block.match(/url\(\.?\/?(files\/[^)]+?\.woff2)\)/);
      if (!src) continue;
      const m = src[1].match(/-(latin-ext|latin)-[a-z0-9]+-(?:normal|italic)\.woff2$/);
      if (!m) continue; // skip cyrillic, greek, vietnamese, ...
      const get = (p) => { const r = block.match(new RegExp(p + "\\s*:\\s*([^;]+);")); return r ? r[1].trim() : null; };
      const buf = fs.readFileSync(path.join(dir, src[1]));
      const name = path.basename(src[1], ".woff2") + "." + crypto.createHash("sha1").update(buf).digest("hex").slice(0, 8) + ".woff2";
      fs.writeFileSync(path.join(FONT_DIR, name), buf);
      const style = get("font-style") || "normal";
      faces.push(
        `@font-face{font-family:'${s.family}';font-style:${style};font-weight:${get("font-weight")};font-display:swap;` +
          `src:url(../fonts/${name}) format('woff2');unicode-range:${get("unicode-range")}}`
      );
      fileFor[`${s.family}|${m[1]}|${style}`] = name;
    }
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(path.join(PUB, "css"), { recursive: true });
fs.writeFileSync(
  path.join(PUB, "css/fonts.css"),
  "/* Self-hosted fonts (generated by scripts/perf-setup.js). Browsers download a file only when the page uses it. */\n" + faces.join("\n") + "\n"
);
const nFiles = fs.readdirSync(FONT_DIR).length;
log(`  ${nFiles} font files -> public/fonts/, rules -> public/css/fonts.css`);

/* ---------- 2. HTML pages ---------- */
const BODY_FONT = { "contact.html": "Montserrat", "portfolio.html": "Montserrat" }; // everything else uses Inter
const GOOGLE_LINK = /[ \t]*<link\b[^>]*?(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>[ \t]*\r?\n?/gi;
let changed = 0;
for (const f of fs.readdirSync(PUB).filter((x) => x.endsWith(".html"))) {
  const p = path.join(PUB, f);
  let html = fs.readFileSync(p, "utf8");
  const orig = html;

  // strip hand-written version numbers on local css/js
  html = html.replace(/(<(?:link|script)\b[^>]*?\b(?:href|src)\s*=\s*["'](?!https?:|\/\/)[^"'?]+\.(?:css|js))\?v=[^"']*(["'])/gi, "$1$2");

  if (GOOGLE_LINK.test(html) || /fonts\.googleapis/.test(html)) {
    GOOGLE_LINK.lastIndex = 0;
    const body = fileFor[`${BODY_FONT[f] || "Inter"}|latin|normal`];
    const inject =
      `<link rel="preload" href="fonts/${body}" as="font" type="font/woff2" crossorigin>\n` +
      `<link rel="stylesheet" href="css/fonts.css">\n`;
    let first = true;
    html = html.replace(GOOGLE_LINK, () => (first ? ((first = false), inject) : ""));
  }
  if (html !== orig) { fs.writeFileSync(p, html); changed++; log(`  updated ${f}`); }
}
if (!changed) log("  HTML already up to date");

/* ---------- 3. netlify.toml ---------- */
const tomlPath = path.join(ROOT, "netlify.toml");
let toml = fs.readFileSync(tomlPath, "utf8");
toml = toml
  .replace(/publish\s*=\s*"public"/, 'publish = "dist"')
  .replace(/command\s*=\s*"node scripts\/predeploy-check\.js"/, 'command = "node scripts/predeploy-check.js && node scripts/build.js"')
  .replace(/font-src https:\/\/fonts\.gstatic\.com;/g, "font-src 'self';")
  .replace(/ https:\/\/fonts\.googleapis\.com/g, "")
  .replace(/ https:\/\/fonts\.gstatic\.com/g, "");
if (!toml.includes("# --- cache rules for fingerprinted assets ---")) {
  toml += `
# --- cache rules for fingerprinted assets ---
# scripts/build.js writes CSS/JS to /assets/<name>.<content-hash>.<ext>. A changed file gets a new URL,
# so these can be cached for a year without anyone ever seeing a stale file.
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# Fonts in /fonts carry a content hash in their file name too.
[[headers]]
  for = "/fonts/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
# HTML keeps Netlify's default (always revalidate), so a deploy shows up immediately and points at the new /assets files.
`;
}
fs.writeFileSync(tomlPath, toml);
log("  netlify.toml: publish=dist, build step, cache headers, CSP no longer lists Google Fonts");

/* ---------- 4. package.json / .gitignore ---------- */
const pkgPath = path.join(ROOT, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.scripts = Object.assign({}, pkg.scripts, { build: "node scripts/build.js" });
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
const giPath = path.join(ROOT, ".gitignore");
const gi = fs.existsSync(giPath) ? fs.readFileSync(giPath, "utf8") : "";
const wantIgnore = ["dist/", ".perf-backup-*/"].filter((l) => !gi.split(/\r?\n/).includes(l));
if (wantIgnore.length) fs.writeFileSync(giPath, gi.replace(/\n*$/, "\n") + "\n# build output and perf-setup backups\n" + wantIgnore.join("\n") + "\n");
log("  package.json: npm run build, .gitignore: dist/ and backups");
log("Setup done.");
