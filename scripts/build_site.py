#!/usr/bin/env python3
"""Generate portfolio pages and shared partials from data/*.json."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT_PORTFOLIOS = ROOT / "portfolios"
DIM_CACHE_PATH = DATA / ".image-dims.json"

# Fallback only when sips cannot read a file.
DEFAULT_W, DEFAULT_H = 1100, 733
DEFAULT_GALLERY_LIMIT = 40

_DIM_CACHE: dict[str, list[int]] | None = None


def load(name: str):
    return json.loads((DATA / name).read_text())


def gallery_limit(gallery: dict):
    """None / null / 0 / false = show all. Missing key uses DEFAULT_GALLERY_LIMIT."""
    if "limit" not in gallery:
        return DEFAULT_GALLERY_LIMIT
    limit = gallery["limit"]
    if limit in (None, False, 0, "0", ""):
        return None
    return int(limit)


def _load_dim_cache() -> dict[str, list[int]]:
    global _DIM_CACHE
    if _DIM_CACHE is not None:
        return _DIM_CACHE
    if DIM_CACHE_PATH.exists():
        try:
            _DIM_CACHE = json.loads(DIM_CACHE_PATH.read_text())
        except json.JSONDecodeError:
            _DIM_CACHE = {}
    else:
        _DIM_CACHE = {}
    return _DIM_CACHE


def _save_dim_cache() -> None:
    if _DIM_CACHE is None:
        return
    DIM_CACHE_PATH.write_text(json.dumps(_DIM_CACHE, separators=(",", ":")))


def image_dims(path: Path) -> tuple[int, int]:
    """Return real pixel width/height so Pixieset justified layout keeps portrait vs landscape."""
    cache = _load_dim_cache()
    key = str(path.relative_to(ROOT))
    mtime = str(int(path.stat().st_mtime))
    hit = cache.get(key)
    if hit and len(hit) == 3 and str(hit[2]) == mtime:
        return int(hit[0]), int(hit[1])

    w, h = DEFAULT_W, DEFAULT_H
    try:
        out = subprocess.check_output(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
            text=True,
            stderr=subprocess.DEVNULL,
        )
        for line in out.splitlines():
            if "pixelWidth" in line:
                w = int(line.split()[-1])
            elif "pixelHeight" in line:
                h = int(line.split()[-1])
    except (subprocess.CalledProcessError, ValueError, OSError):
        pass

    cache[key] = [w, h, int(mtime)]
    return w, h


def list_images(gallery: dict):
    limit = gallery_limit(gallery)
    label = gallery["label"]
    category = gallery.get("category", "")
    album = gallery.get("slug") or label

    if gallery.get("path"):
        web = ROOT / gallery["path"]
        full_prefix = gallery.get("fullPath", gallery["path"]).replace("/web", "/full")
        if not web.exists():
            return []
        files = sorted(
            p for p in web.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )
        if limit is not None:
            files = files[:limit]
        rows = []
        for p in files:
            w, h = image_dims(p)
            rows.append(
                {
                    "web": f"../{gallery['path']}/{p.name}",
                    "full": f"../{full_prefix}/{p.name}",
                    "w": w,
                    "h": h,
                    "label": label,
                    "category": category,
                    "album": album,
                }
            )
        return rows

    slug = gallery["slug"]
    web = ROOT / "assets" / "club" / slug / "web"
    if not web.exists():
        return []
    files = sorted(p for p in web.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if limit is not None:
        files = files[:limit]
    rows = []
    for p in files:
        w, h = image_dims(p)
        rows.append(
            {
                "web": f"../assets/club/{slug}/web/{p.name}",
                "full": f"../assets/club/{slug}/full/{p.name}",
                "w": w,
                "h": h,
                "label": label,
                "category": category,
                "album": album,
            }
        )
    return rows


def cover_for(person: dict):
    for gallery in person.get("galleries", []):
        images = list_images({**gallery, "limit": 1})
        if images:
            src = images[0]["web"].replace("../", "")
            return src
    return "assets/club/john-indoor/web/196-1m3614-L-DSC09531.JPG"


def nav(site, active: str, prefix: str = ""):
    links = []
    for item in site["nav"]:
        href = prefix + item["href"]
        current = ' aria-current="page"' if item["href"] == active else ""
        links.append(f'<a href="{href}"{current}>{item["label"]}</a>')
    return "\n      ".join(links)


def shell(site, title: str, description: str, active: str, body: str, prefix: str = "", over_hero: bool = False):
    fonts = "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700&display=swap"
    bar_attr = ' data-site-bar' + (' class="site-bar is-over-hero"' if over_hero else ' class="site-bar"')
    if not over_hero:
        bar_attr = ' class="site-bar" data-site-bar'
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#00467F" />
  <meta name="description" content="{description}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{description}" />
  <link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml" />
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="{fonts}" rel="stylesheet" />
  <link rel="stylesheet" href="{prefix}assets/site.css" />
  <link rel="stylesheet" href="{prefix}assets/portfolio.css" />
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header{bar_attr}>
    <a class="mark" href="{prefix}index.html">{site["shortName"]}<small>Student collective</small></a>
    <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" data-site-nav aria-label="Site">
      {nav(site, active, prefix)}
    </nav>
    <a class="btn btn-ghost" href="{prefix}book.html">Book a Shoot</a>
  </header>
  <main id="main">
{body}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <div>
        <strong>{site["shortName"]}</strong>
        <p>{site["school"]} · {site["city"]}</p>
        <p>{site["address"]}</p>
      </div>
      <div>
        <strong>Contact</strong>
        <p><a href="{site["instagram"]}" target="_blank" rel="noreferrer">{site["instagramHandle"]}</a></p>
        <p><a href="{site["phoneHref"]}">{site["phone"]}</a></p>
        <p><a href="{site["schoolContact"]}" target="_blank" rel="noreferrer">School contact</a></p>
      </div>
      <div>
        <strong>Policies</strong>
        <p><a href="{prefix}privacy.html">Privacy notice</a> · <a href="{prefix}exhibition.html">Exhibitions</a></p>
        <p>Inquiries are not confirmed bookings.</p>
        <p>Photo removal: message {site["instagramHandle"]}.</p>
      </div>
    </div>
  </footer>
  <script src="{prefix}assets/site.js"></script>
  <script src="{prefix}assets/gallery.js"></script>
</body>
</html>
'''


def figures_html(person: dict, images: list[dict]):
    bits = []
    for image in images:
        album = image.get("album") or image.get("label") or "All"
        label = image.get("label") or album
        bits.append(
            f'''        <figure class="gallery-item" data-category="{album}" data-album="{album}" data-photographer="{person["name"]}" data-categories="{album}">
          <img src="{image["web"]}" alt="Photograph by {person["name"]}" loading="lazy" width="{image["w"]}" height="{image["h"]}" />
          <figcaption><strong>{label}</strong><span>{person["name"]}</span></figcaption>
        </figure>'''
        )
    return "\n".join(bits)


def build_portfolio_page(site, person):
    images = []
    albums: list[tuple[str, str]] = []  # (filter value, button label)
    seen = set()
    for gallery in person.get("galleries", []):
        chunk = list_images(gallery)
        images.extend(chunk)
        key = gallery.get("slug") or gallery.get("label")
        label = gallery.get("label") or key
        if key and key not in seen and chunk:
            seen.add(key)
            albums.append((key, label))

    specialty = ", ".join(person.get("specialties") or []) or "Photography"
    filters = ['<button type="button" class="filter-btn is-active" data-filter="all" aria-pressed="true">All</button>']
    for value, label in albums:
        filters.append(
            f'<button type="button" class="filter-btn" data-filter="{value}" aria-pressed="false">{label}</button>'
        )

    social = ""
    if person.get("instagram"):
        social = f'<a class="link-quiet" href="{person["instagram"]}" target="_blank" rel="noreferrer">{person.get("instagramHandle") or "Instagram"}</a>'

    equipment = f'<p class="lede">Equipment: {person["equipment"]}</p>' if person.get("equipment") else ""
    bio = f'<p class="lede">{person["bio"]}</p>' if person.get("bio") else ""
    empty = ""
    if not images:
        empty = '<p class="lede">Gallery coming soon. Photographs will appear here once this member uploads an edited set.</p>'

    body = f'''    <section class="page-hero">
      <div class="wrap">
        <p class="kicker">{person.get("role") or "Photographer"}</p>
        <h1>{person["name"]}</h1>
        <p class="lede">{specialty}</p>
        {equipment}
        {bio}
        <div class="actions">
          <a class="btn btn-navy" href="../book.html?photographer={person["id"]}">Book This Photographer</a>
          <a class="btn btn-ghost" href="../portfolios.html">All portfolios</a>
          {social}
        </div>
      </div>
    </section>
    <section class="section-tight">
      <div class="wrap">
        <div class="filters" data-filter-group=".gallery-item" role="group" aria-label="Filter by album">
          {"".join(filters)}
        </div>
        {empty}
        <div class="masonry">
{figures_html(person, images)}
        </div>
      </div>
    </section>
'''
    html = shell(
        site,
        f'{person["name"]} | {site["shortName"]}',
        f'{person["name"]} — student photographer with VCHS Photography Club.',
        "portfolios.html",
        body,
        prefix="../",
    )
    OUT_PORTFOLIOS.mkdir(exist_ok=True)
    (OUT_PORTFOLIOS / f'{person["id"]}.html').write_text(html)
    return len(images)


def build_portfolios_index(site, people):
    cards = []
    for person in people:
        cover = cover_for(person)
        specs = ", ".join(person.get("specialties") or []) or "Portfolio coming soon"
        cats = "|".join(person.get("specialties") or ["Unlisted"])
        cards.append(
            f'''      <a class="person-card reveal" href="portfolios/{person["id"]}.html" data-categories="{cats}">
        <div class="thumb"><img src="{cover}" alt="" loading="lazy" /></div>
        <div class="meta">
          <span class="role">{person.get("role") or "Member"}</span>
          <h3>{person["name"]}</h3>
          <p class="specs">{specs}</p>
        </div>
      </a>'''
        )

    categories = [
        "Portraits & Headshots",
        "Sports & Athletics",
        "School Events",
        "Landscape & Nature",
        "Creative & Fine Art",
        "Community & Documentary Photography",
    ]
    filters = ['<button type="button" class="filter-btn is-active" data-filter="all" aria-pressed="true">All</button>']
    for cat in categories:
        filters.append(
            f'<button type="button" class="filter-btn" data-filter="{cat}" aria-pressed="false">{cat}</button>'
        )

    body = f'''    <section class="page-hero">
      <div class="wrap">
        <p class="kicker">Portfolios</p>
        <h1>Student photographers.</h1>
        <p class="lede">Browse member work by specialty. Click a photographer to open their gallery. Booking goes through the club inquiry form — personal emails are not published here.</p>
        <div class="filters" data-filter-group=".person-card" role="group" aria-label="Filter portfolios">
          {"".join(filters)}
        </div>
      </div>
    </section>
    <section class="section-tight">
      <div class="wrap">
        <div class="person-grid">
{chr(10).join(cards)}
        </div>
      </div>
    </section>
'''
    (ROOT / "portfolios.html").write_text(
        shell(site, f'Portfolios | {site["shortName"]}', "Student photography portfolios from VCHS Photography Club.", "portfolios.html", body)
    )


def main():
    site = load("site.json")
    people = load("photographers.json")
    OUT_PORTFOLIOS.mkdir(exist_ok=True)
    total = 0
    for person in people:
        n = build_portfolio_page(site, person)
        total += n
        print(f'{person["id"]}: {n}')
    build_portfolios_index(site, people)
    _save_dim_cache()
    print("portfolios index ok; images", total)


if __name__ == "__main__":
    main()
