"""
Auto-update build script for personal website.
Fetches data from Google Scholar (via SerpAPI) and ORCID,
writes JSON data files, then rebuilds index.html from template.
"""

import json
import os
import re
import sys
import urllib.request
import urllib.parse
from datetime import datetime


# ── Configuration ──────────────────────────────────────────────
SCHOLAR_ID = "lhY8R2wAAAAJ"
ORCID_ID = "0000-0003-3091-9555"
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "")

# Allow passing via CLI: python build.py --key YOUR_KEY
if "--key" in sys.argv:
    idx = sys.argv.index("--key")
    if idx + 1 < len(sys.argv):
        SERPAPI_KEY = sys.argv[idx + 1]

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
TEMPLATE_FILE = os.path.join(os.path.dirname(__file__), "template.html")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "index.html")


# ── Helpers ────────────────────────────────────────────────────

def fetch_json(url, headers=None):
    """Fetch JSON from a URL."""
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def save_json(filename, data):
    """Save data as JSON in the data/ directory."""
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {path}")


def load_json(filename):
    """Load JSON from the data/ directory."""
    path = os.path.join(DATA_DIR, filename)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


# ── Google Scholar (via SerpAPI) ───────────────────────────────

def fetch_scholar_profile():
    """Fetch author profile: citations, h-index, i10-index."""
    if not SERPAPI_KEY:
        print("  [WARN] SERPAPI_KEY not set, skipping Scholar profile")
        return None

    params = urllib.parse.urlencode({
        "engine": "google_scholar_author",
        "author_id": SCHOLAR_ID,
        "api_key": SERPAPI_KEY,
    })
    url = f"https://serpapi.com/search.json?{params}"
    data = fetch_json(url)

    # Extract citation stats
    cited_by = data.get("cited_by", {})
    table = cited_by.get("table", [])

    stats = {"citations": 0, "h_index": 0, "i10_index": 0}
    for row in table:
        if "citations" in row:
            stats["citations"] = row["citations"].get("all", 0)
        if "h_index" in row:
            stats["h_index"] = row["h_index"].get("all", 0)
        if "i10_index" in row:
            stats["i10_index"] = row["i10_index"].get("all", 0)

    # Extract articles
    articles = []
    for article in data.get("articles", []):
        articles.append({
            "title": article.get("title", ""),
            "authors": article.get("authors", ""),
            "venue": article.get("publication", ""),
            "year": article.get("year", ""),
            "citations": article.get("cited_by", {}).get("value", 0),
            "link": article.get("link", ""),
        })

    result = {
        "stats": stats,
        "articles": articles,
        "fetched_at": datetime.now(tz=None).isoformat() + "Z",
    }
    save_json("scholar.json", result)
    return result


def fetch_scholar_all_articles():
    """Fetch ALL articles with pagination (for complete publication list)."""
    if not SERPAPI_KEY:
        return None

    all_articles = []
    start = 0

    while True:
        params = urllib.parse.urlencode({
            "engine": "google_scholar_author",
            "author_id": SCHOLAR_ID,
            "api_key": SERPAPI_KEY,
            "start": start,
            "num": 100,
        })
        url = f"https://serpapi.com/search.json?{params}"
        data = fetch_json(url)

        articles = data.get("articles", [])
        if not articles:
            break

        for article in articles:
            all_articles.append({
                "title": article.get("title", ""),
                "authors": article.get("authors", ""),
                "venue": article.get("publication", ""),
                "year": article.get("year", ""),
                "citations": article.get("cited_by", {}).get("value", 0),
                "link": article.get("link", ""),
            })

        # Check if there are more pages
        if len(articles) < 100:
            break
        start += 100

    return all_articles


# ── ORCID ──────────────────────────────────────────────────────

def fetch_orcid_works():
    """Fetch publications from ORCID public API."""
    url = f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"
    headers = {"Accept": "application/json"}
    data = fetch_json(url, headers)

    works = []
    for group in data.get("group", []):
        summary = group.get("work-summary", [{}])[0]
        title_obj = summary.get("title", {})
        title = title_obj.get("title", {}).get("value", "") if title_obj else ""

        # Get year
        pub_date = summary.get("publication-date", {}) or {}
        year = ""
        if pub_date and pub_date.get("year"):
            year = pub_date["year"].get("value", "")

        # Get journal
        journal = summary.get("journal-title", {})
        venue = journal.get("value", "") if journal else ""

        # Get DOI from external IDs
        doi = ""
        ext_ids = summary.get("external-ids", {}) or {}
        for eid in ext_ids.get("external-id", []):
            if eid.get("external-id-type") == "doi":
                doi = eid.get("external-id-value", "")
                break

        works.append({
            "title": title,
            "year": year,
            "venue": venue,
            "doi": doi,
            "put_code": summary.get("put-code", ""),
        })

    # Sort by year descending
    works.sort(key=lambda w: w.get("year", "0"), reverse=True)

    result = {
        "works": works,
        "total": len(works),
        "fetched_at": datetime.now(tz=None).isoformat() + "Z",
    }
    save_json("orcid.json", result)
    return result


# ── HTML Builder ───────────────────────────────────────────────

def format_authors(authors_str):
    """Bold the author name in the authors string."""
    if not authors_str:
        return ""
    result = authors_str
    # Handle variations — use a single pass to avoid double-wrapping
    # Match all name variations: MA Qureshi, M Adnan Qureshi, M. Adnan Qureshi,
    # MAMH Qureshi, A Qureshi, AM Qureshi
    result = re.sub(
        r"(?:Mohammed\s+)?(?:MAMH|M\.?\s+Adnan\s+|M\.?\s*A\.?\s*|A\.?M\.?\s*|A\s+)Qureshi",
        "<strong>MA Qureshi</strong>",
        result,
    )
    return result


def build_metrics_html(stats, pub_count=8):
    """Build the metrics grid HTML."""
    return f'''      <div class="metrics-row">
        <span class="metrics-row-label">Industry</span>
        <div class="metrics-grid metrics-grid--half">
          <div class="metric-card">
            <span class="metric-number" data-target="55">0</span>
            <span class="metric-label">Client Projects</span>
          </div>
          <div class="metric-card">
            <span class="metric-number" data-target="100">0</span>
            <span class="metric-label">Ingredients Studied</span>
          </div>
        </div>
      </div>
      <div class="metrics-row">
        <span class="metrics-row-label">Academic</span>
        <div class="metrics-grid metrics-grid--half">
          <div class="metric-card">
            <span class="metric-number" data-target="{pub_count}">{pub_count}</span>
            <span class="metric-label">Publications</span>
          </div>
          <div class="metric-card">
            <span class="metric-number" data-target="2">0</span>
            <span class="metric-label">NIH Grants (PI)</span>
          </div>
        </div>
      </div>'''


def build_publications_html(articles):
    """Build the publications list HTML from Scholar data."""
    # Filter out dissertations and articles without year
    SKIP_VENUES = ["university of texas", "dissertation", "thesis"]
    filtered = []
    for a in articles:
        if not a.get("year"):
            continue
        venue_lower = (a.get("venue") or "").lower()
        if any(skip in venue_lower for skip in SKIP_VENUES):
            continue
        filtered.append(a)

    # Deduplicate by title, sort by citations
    seen_titles = set()
    top_articles = []
    for a in sorted(filtered, key=lambda x: x.get("citations") or 0, reverse=True):
        title_lower = a["title"].lower().strip()
        if title_lower not in seen_titles:
            seen_titles.add(title_lower)
            top_articles.append(a)

    # Sort by year descending for display
    top_articles.sort(key=lambda x: x.get("year", "0"), reverse=True)

    # Take top 8 publications
    top_articles = top_articles[:8]

    items = []
    for pub in top_articles:
        authors_html = format_authors(pub.get("authors", ""))
        venue = pub.get("venue", "")
        year = pub.get("year", "")
        citations = pub.get("citations") or 0
        link = pub.get("link", "")

        # Co-first author badge — only for the 2020 PLoS Pathogens paper
        badge = ""
        title_lower = pub.get("title", "").lower()
        if "branched-chain amino acid" in title_lower and pub.get("year") == "2020":
            badge = ' <span class="pub-badge">Co-first author</span>'

        doi_link = ""
        if link:
            doi_link = f'\n              <a href="{link}" target="_blank" rel="noopener" class="pub-doi">View</a>'

        citation_text = f"{citations} citation{'s' if citations != 1 else ''}" if citations else ""

        items.append(f'''        <li class="pub-item">
          <div class="pub-year">{year}</div>
          <div class="pub-content">
            <h3 class="pub-title">{pub["title"]}</h3>
            <p class="pub-authors">{authors_html}{badge}</p>
            <p class="pub-venue"><em>{venue}</em></p>
            <div class="pub-meta">
              <span class="pub-citations">{citation_text}</span>{doi_link}
            </div>
          </div>
        </li>''')

    return "\n".join(items)


def build_html():
    """Read template.html, inject data, write index.html."""
    if not os.path.exists(TEMPLATE_FILE):
        print(f"  [WARN] Template not found: {TEMPLATE_FILE}")
        return False

    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        html = f.read()

    # Load data
    scholar = load_json("scholar.json")
    orcid = load_json("orcid.json")

    if scholar:
        stats = scholar.get("stats", {})
        articles = scholar.get("articles", [])

        # Count real publications (filter same as pub list)
        SKIP_VENUES = ["university of texas", "dissertation", "thesis"]
        pub_count = len([a for a in articles if a.get("year") and
                        not any(s in (a.get("venue") or "").lower() for s in SKIP_VENUES)])

        # Replace metrics
        html = re.sub(
            r'<!--METRICS_START-->.*?<!--METRICS_END-->',
            f'<!--METRICS_START-->\n{build_metrics_html(stats, pub_count)}\n      <!--METRICS_END-->',
            html,
            flags=re.DOTALL,
        )

        # Replace publications
        pub_html = build_publications_html(articles)
        html = re.sub(
            r'<!--PUBS_START-->.*?<!--PUBS_END-->',
            f'<!--PUBS_START-->\n{pub_html}\n      <!--PUBS_END-->',
            html,
            flags=re.DOTALL,
        )

        # Replace last-updated timestamp
        fetched = scholar.get("fetched_at", "")
        if fetched:
            date_str = fetched[:10]
            html = html.replace("<!--LAST_UPDATED-->", f"Last updated: {date_str}")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"  Built {OUTPUT_FILE}")
    return True


# ── Main ───────────────────────────────────────────────────────

def main():
    print("[BUILD] Personal website auto-updater")
    print(f"  Scholar ID: {SCHOLAR_ID}")
    print(f"  ORCID ID:   {ORCID_ID}")
    print()

    # Step 1: Fetch Google Scholar data
    print("[SCHOLAR] Fetching Google Scholar data...")
    try:
        scholar = fetch_scholar_profile()
        if scholar:
            stats = scholar["stats"]
            print(f"  Citations: {stats['citations']}, h-index: {stats['h_index']}")
            print(f"  Articles found: {len(scholar['articles'])}")
    except Exception as e:
        print(f"  [ERROR] Scholar fetch failed: {e}")

    # Step 2: Fetch ORCID data
    print("\n[ORCID] Fetching ORCID data...")
    try:
        orcid = fetch_orcid_works()
        if orcid:
            print(f"  Works found: {orcid['total']}")
    except Exception as e:
        print(f"  [ERROR] ORCID fetch failed: {e}")

    # Step 3: Build HTML
    print("\n[HTML] Building index.html from template...")
    try:
        success = build_html()
        if success:
            print("\n[DONE] Site updated successfully!")
        else:
            print("\n[WARN] Build skipped (no template found)")
    except Exception as e:
        print(f"\n[ERROR] Build failed: {e}")
        raise

    print()


if __name__ == "__main__":
    main()
