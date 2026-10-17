#!/usr/bin/env python3
"""Applies mounting-option.patch whitespace-tolerantly.
Usage (from repo root):  python3 apply_mounting.py [--dry-run]
Matches each removed line by its trimmed text, keeps the file's own
indentation and line endings, and refuses to touch a file if any hunk fails."""
import re, sys, os
dry = "--dry-run" in sys.argv
here = os.path.dirname(os.path.abspath(__file__))
patch = open(os.path.join(here, "mounting-option.patch"), encoding="utf8").read().split("\n")

files, cur, hunk = {}, None, None
for l in patch:
    if l.startswith("diff --git"):
        cur = l.split(" b/")[1]; files[cur] = []
    elif l.startswith("@@"):
        hunk = {"hint": int(re.match(r"@@ -(\d+)", l).group(1)), "old": [], "new": []}
        files[cur].append(hunk)
    elif hunk is not None and l.startswith("-") and not l.startswith("---"):
        hunk["old"].append(l[1:])
    elif hunk is not None and l.startswith("+") and not l.startswith("+++"):
        hunk["new"].append(l[1:])

ind = lambda s: len(s) - len(s.lstrip())
ok = True
results = {}
for path, hunks in files.items():
    if not os.path.exists(path):
        print(f"MISSING {path} (run from the repo root)"); ok = False; continue
    raw = open(path, encoding="utf8", newline="").read()
    eol = "\r\n" if "\r\n" in raw else "\n"
    lines = raw.split(eol)
    cursor = 0
    for i, h in enumerate(hunks, 1):
        olds = [o.strip() for o in h["old"]]
        cands = [p for p in range(len(lines) - len(olds) + 1)
                 if [x.strip() for x in lines[p:p+len(olds)]] == olds]
        if not cands:
            print(f"FAILED {path} hunk {i}: {h['old'][0].strip()[:70]}"); ok = False; continue
        p = min(cands, key=lambda c: abs(c - (h["hint"] - 1)))
        if len(cands) > 1:
            print(f"note: {path} hunk {i} matched {len(cands)} places, using nearest to line {h['hint']}")
        base = ind(lines[p]); pbase = ind(h["old"][0])
        new = [(" " * max(0, base + ind(n) - pbase)) + n.lstrip() for n in h["new"]]
        lines[p:p+len(olds)] = new
    results[path] = eol.join(lines)
if not ok:
    print("\nNothing was written."); sys.exit(1)
for path, text in results.items():
    if not dry: open(path, "w", encoding="utf8", newline="").write(text)
    print(("would patch " if dry else "patched ") + path)
