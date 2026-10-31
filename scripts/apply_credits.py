#!/usr/bin/env python3
"""Apply photographer credits from folder slugs / filename tokens across HTML."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CREDITS = json.loads((ROOT / "data" / "gallery-credits.json").read_text())
BY_SLUG = CREDITS["bySlug"]
TOKENS = {k.lower(): v for k, v in CREDITS["filenameTokens"].items()}
SLUG_PATTERNS = CREDITS.get("slugPatterns") or []
PENDING = CREDITS["pendingLabel"]

SLUG_RE = re.compile(r"assets/(?:club/)?([a-z0-9-]+)/(?:web|full)/([^\"'\s>]+)", re.I)
FIG_RE = re.compile(
    r'(<figure class="gallery-item"[^>]*?>)(.*?)(</figure>)',
    re.S,
)
ATTR_PHOTO = re.compile(r'data-photographer="[^"]*"')
ALT_RE = re.compile(r'alt="[^"]*"')
CAPTION_SPAN = re.compile(r"(<figcaption>.*?<span>)(.*?)(</span>)", re.S)


def credit_for(slug: str, filename: str) -> str:
    stem = Path(filename).stem.lower()
    # Prefer explicit filename tokens (week4 dumps, katherine-01, etc.)
    for token, name in sorted(TOKENS.items(), key=lambda x: -len(x[0])):
        if re.search(rf"(^|[-_]){re.escape(token)}(\d*)($|[-_.])", stem) or stem.endswith(token):
            return name
        if token in stem and not stem.startswith("dsc") and not stem.startswith("img"):
            # avoid matching short tokens inside random ids
            if len(token) >= 4:
                return name

    # Drive-owner patterns scoped to a folder slug (e.g. week4 IMG_ / DSC)
    for rule in SLUG_PATTERNS:
        if rule.get("slug") != slug:
            continue
        if re.search(rule["pattern"], stem, re.I):
            return rule["credit"]

    mapped = BY_SLUG.get(slug)
    if mapped:
        return mapped
    if slug in BY_SLUG and mapped is None:
        return PENDING

    # Fallback: first name-like segment of slug
    first = slug.split("-")[0]
    for token, name in TOKENS.items():
        if first == token or first.startswith(token):
            return name
    return PENDING


def patch_figure(block: str) -> str:
    m = SLUG_RE.search(block)
    if not m:
        m2 = re.search(r"assets/andrew/(?:web|full)/([^\"'\s>]+)", block)
        if not m2:
            return block
        name = "Andrew Liang"
    else:
        slug, filename = m.group(1), m.group(2)
        name = credit_for(slug, filename)

    html = block
    if ATTR_PHOTO.search(html):
        html = ATTR_PHOTO.sub(f'data-photographer="{name}"', html)
    else:
        html = html.replace(
            'class="gallery-item"',
            f'class="gallery-item" data-photographer="{name}"',
            1,
        )
    alt = f"Photograph — {name}" if name == PENDING else f"Photograph by {name}"
    html = ALT_RE.sub(f'alt="{alt}"', html, count=1)
    if CAPTION_SPAN.search(html):
        html = CAPTION_SPAN.sub(rf"\1{name}\3", html, count=1)
    return html


def patch_file(path: Path) -> int:
    text = path.read_text()
    count = 0

    def repl(match: re.Match) -> str:
        nonlocal count
        original = match.group(0)
        updated = patch_figure(original)
        if updated != original:
            count += 1
        return updated

    new_text = FIG_RE.sub(repl, text)
    # Also fix short first-name-only credits in loose text
    replacements = {
        "Photograph by Katherine\"": 'Photograph by Katherine Tsai"',
        ">Katherine</span>": ">Katherine Tsai</span>",
        'data-photographer="Katherine"': 'data-photographer="Katherine Tsai"',
    }
    for a, b in replacements.items():
        if a in new_text:
            new_text = new_text.replace(a, b)
            count += 1

    if new_text != text:
        path.write_text(new_text)
    return count


def main():
    total = 0
    targets = [ROOT / "gallery.html", ROOT / "projects.html", ROOT / "index.html"]
    targets += sorted((ROOT / "events").glob("*.html"))
    targets += sorted((ROOT / "portfolios").glob("*.html"))
    for path in targets:
        if not path.exists():
            continue
        n = patch_file(path)
        total += n
        print(f"{path.relative_to(ROOT)}: {n}")
    print("updated figures", total)


if __name__ == "__main__":
    main()
