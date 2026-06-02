import argparse
import requests
from bs4 import BeautifulSoup
import json
import re
import shutil
import time
import os
from urllib.parse import urlparse


def get_slug(url):
    path = urlparse(url).path.rstrip("/")
    return path.split("/")[-1]


def to_https(url):
    # The CDN serves everything over HTTPS; upgrade scraped http:// links so the
    # app (served over HTTPS) can fetch them without mixed-content blocking.
    if url and url.startswith("http://"):
        return "https://" + url[len("http://"):]
    return url


def scrape_artist(url):
    resp = requests.get(url)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    article = soup.find("article")
    if not article:
        return None

    # Name
    h1 = article.find("h1", class_="entry-title")
    name = h1.get_text(strip=True) if h1 else ""

    # Image — first img in entry-content, first URL from srcset (clean CDN URL)
    image_url = None
    entry_content = article.find("div", class_="entry-content")
    if entry_content:
        img = entry_content.find("img")
        if img:
            srcset = img.get("srcset", "")
            if srcset:
                image_url = srcset.split(",")[0].strip().split(" ")[0]
            else:
                image_url = img.get("src") or None
            image_url = to_https(image_url)

    # Body paragraphs (plain text, skip mp3-only paragraphs)
    body = []
    tracks = []

    if entry_content:
        for p in entry_content.find_all("p"):
            links = p.find_all("a", href=True)
            mp3_links = [a for a in links if a["href"].endswith(".mp3")]

            # Skip paragraphs that contain only mp3 links (those become tracks)
            if mp3_links and len(mp3_links) == len(links):
                continue

            # Skip paragraphs whose only content is inside <strong> tags (section headers)
            strong_tags = p.find_all("strong")
            if strong_tags:
                strong_text = " ".join(s.get_text(separator=" ", strip=True) for s in strong_tags)
                full_text = p.get_text(separator=" ", strip=True)
                normalize = lambda t: " ".join(t.replace("\xa0", " ").split())
                if normalize(strong_text) == normalize(full_text):
                    continue

            text = p.get_text(separator=" ", strip=True)
            # Skip empty or &nbsp;-only paragraphs
            if text.replace("\xa0", "").strip():
                body.append(text)

        # Tracks: all .mp3 links anywhere in entry-content
        for a in entry_content.find_all("a", href=True):
            if a["href"].endswith(".mp3"):
                tracks.append({
                    "name": a.get_text(strip=True),
                    "url": to_https(a["href"]),
                })

    return {
        "name": name,
        "url": url,
        "image_url": image_url,
        "body": body,
        "tracks": tracks,
    }


OUTPUT_DIR = "artists"
MANIFEST_NAME = "manifest.json"
_REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
_WEB_PUBLIC = os.path.join(_REPO_ROOT, "kirtansewa-web", "public")
PUBLIC_ARTISTS_DIR = os.path.join(_WEB_PUBLIC, "artists")
# Filenames from scrape: "{index}-{slug}.json" (index is decimal digits, slug may contain hyphens)
_ARTIST_JSON_RE = re.compile(r"^(\d+)-(.+)\.json$")


def update_manifest(output_dir):
    """Rebuild manifest.json from all NN-slug.json files (tells the web app which slugs have detail JSON)."""
    if not os.path.isdir(output_dir):
        return
    entries = []
    for name in os.listdir(output_dir):
        if name == MANIFEST_NAME or not name.endswith(".json"):
            continue
        m = _ARTIST_JSON_RE.match(name)
        if m:
            slug = m.group(2)
            file_path = os.path.join(output_dir, name)
            with open(file_path, encoding="utf-8") as f:
                data = json.load(f)
            entries.append({
                "slug": slug,
                "image_url": data.get("image_url"),
                "track_count": len(data.get("tracks", [])),
            })
    entries.sort(key=lambda e: e["slug"])
    path = os.path.join(output_dir, MANIFEST_NAME)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  Updated {path} ({len(entries)} scraped)")


def mirror_artist_to_public(src_path):
    """Copy scraped JSON into Vite public/artists and rebuild manifest there."""
    if not os.path.isdir(_WEB_PUBLIC):
        return
    os.makedirs(PUBLIC_ARTISTS_DIR, exist_ok=True)
    dest = os.path.join(PUBLIC_ARTISTS_DIR, os.path.basename(src_path))
    shutil.copy2(src_path, dest)
    print(f"  Mirrored {dest}")
    update_manifest(PUBLIC_ARTISTS_DIR)


def save_artist_file(index, slug, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = os.path.join(OUTPUT_DIR, f"{index:02d}-{slug}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  Saved {filename}")
    update_manifest(OUTPUT_DIR)
    mirror_artist_to_public(filename)


def load_artists():
    with open("artists.json", encoding="utf-8") as f:
        return json.load(f)


def main():
    parser = argparse.ArgumentParser(description="Scrape artist detail pages.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("target", nargs="?", help="Single artist: 1-based index or URL")
    group.add_argument("-s", "--start", type=int, metavar="N", help="Start index (inclusive)")
    parser.add_argument("-e", "--end", type=int, metavar="N", help="End index (inclusive), used with --start")
    parser.add_argument(
        "-u",
        "--update",
        action="store_true",
        help="Re-scrape artists that already have a JSON file (default is to skip existing files)",
    )
    args = parser.parse_args()

    artists = load_artists()

    # Resolve which indices to scrape
    single_mode = False
    if args.target is not None:
        single_mode = True
        if args.target.isdigit():
            indices = {int(args.target)}
        else:
            # URL match
            indices = {i + 1 for i, a in enumerate(artists) if a["url"] == args.target}
    elif args.start is not None:
        end = args.end if args.end is not None else len(artists)
        indices = set(range(args.start, end + 1))
    else:
        indices = set(range(1, len(artists) + 1))

    for i, artist in enumerate(artists, start=1):
        if i not in indices:
            continue

        url = artist["url"]
        slug = get_slug(url)
        filename = os.path.join(OUTPUT_DIR, f"{i:02d}-{slug}.json")

        if os.path.exists(filename) and not args.update:
            print(f"Skipping {filename} (already exists, use --update to re-scrape)")
            continue

        print(f"[{i}/{len(artists)}] Scraping {artist['name']}...")
        try:
            data = scrape_artist(url)
            if data:
                if args.update and os.path.exists(filename):
                    with open(filename, encoding="utf-8") as f:
                        existing = json.load(f)
                    if existing == data:
                        print("  Unchanged vs saved JSON, skipped write / manifest / mirror")
                        continue
                save_artist_file(i, slug, data)
        except Exception as e:
            print(f"  Error: {e}")

        if not single_mode:
            time.sleep(0.5)


if __name__ == "__main__":
    main()
