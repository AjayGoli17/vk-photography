import sys, re
SIZE = 'renderOptionGroup("sizeOptions", SIZES.map((s) => { const n = getPrintPrice(s.id, "normal"), p = getPrintPrice(s.id, "premium"); return { id: s.id, name: s.label, sub: n == null || p == null ? "Price on request" : `Normal ${formatINR(n)}<br>Premium ${formatINR(p)}` }; }), customizerState.sizeId, (id) => { customizerState.sizeId = id; refreshCustomizerUI(); });'
FN = ['function renderQualityOptions() {',
 '  renderOptionGroup("qualityOptions", QUALITIES.map((q) => { const p = getPrintPrice(customizerState.sizeId, q.id); return { id: q.id, name: q.name, sub: q.description, price: p == null ? "Price on request" : formatINR(p) }; }), customizerState.qualityId, (id) => { customizerState.qualityId = id; refreshCustomizerUI(); });',
 '}', '']
NOTE = 'Standard Indian frame sizes. Prices shown are for the print only; frame and mounting are extra.'
def load(p):
    raw = open(p, encoding="utf8", newline="").read()
    eol = "\r\n" if "\r\n" in raw else "\n"
    return raw.split(eol), eol
def ind(l): return l[:len(l) - len(l.lstrip())]
lines, eol = load("js/shop.js")
if any(l.strip().startswith("function renderQualityOptions") for l in lines):
    sys.exit("js/shop.js already patched, nothing to do.")
si = [i for i, l in enumerate(lines) if l.strip().startswith('renderOptionGroup("sizeOptions"')]
qi = [i for i, l in enumerate(lines) if l.strip().startswith('renderOptionGroup("qualityOptions"')]
ri = [i for i, l in enumerate(lines) if l.strip().startswith("function refreshCustomizerUI()")]
hl, heol = load("shop.html")
hi = [i for i, l in enumerate(hl) if 'id="sizeOptions"' in l and "shop-section-sub" in l]
if not (len(si) == len(qi) == len(ri) == len(hi) == 1):
    sys.exit(f"Could not find all lines (size={len(si)}, quality={len(qi)}, refresh={len(ri)}, html={len(hi)}). Nothing written.")
new_html = re.sub(r'(font-size:12\.5px;">)[^<]*(</p>)', lambda m: m.group(1) + NOTE + m.group(2), hl[hi[0]], count=1)
if new_html == hl[hi[0]]:
    sys.exit("shop.html size note not found. Nothing written.")
hl[hi[0]] = new_html
lines[si[0]] = ind(lines[si[0]]) + SIZE
lines[qi[0]] = ind(lines[qi[0]]) + "renderQualityOptions();"
r = ri[0]
lines[r + 1:r + 1] = [ind(lines[r]) + "  renderQualityOptions();"]
lines[r:r] = [ind(lines[r]) + x if x else "" for x in FN]
open("js/shop.js", "w", encoding="utf8", newline="").write(eol.join(lines))
open("shop.html", "w", encoding="utf8", newline="").write(heol.join(hl))
print("Patched js/shop.js and shop.html")
