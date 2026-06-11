"""
Re-scrapes recipe files that have empty ingredients, using browser cookies
so that paywalled/login-required sites work.

Run from the scripts/ directory:
  ./venv/bin/python3.14 refill-empty-recipes.py
"""
import importlib.util
import pathlib
import re
import sys

import browser_cookie3
import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load helpers from sibling scripts
def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, pathlib.Path(__file__).parent / filename)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

scrape_mod = _load("scrape_content", "scrape_content.py")
create_mod = _load("create_post_from_url", "create-post-from-url.py")

scrape_recipe_jsonld = scrape_mod.scrape_recipe_jsonld
build_recipe_file    = create_mod.build_recipe_file
clean_title          = create_mod.clean_title

RECIPES_DIR = pathlib.Path(__file__).parent.parent / "_recipes"


def has_empty_ingredients(path):
    content = path.read_text(encoding="utf-8")
    m = re.search(r"^ingredients:\s*\n(.*?)^[a-z]", content, re.MULTILINE | re.DOTALL)
    if not m:
        return False
    items = [l for l in m.group(1).split("\n") if l.strip().startswith("-")]
    return len(items) == 0


def get_source_url(path):
    content = path.read_text(encoding="utf-8")
    m = re.search(r"^source_url:\s*(.+)$", content, re.MULTILINE)
    return m.group(1).strip() if m else None


def fetch_with_cookies(url, cookies):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nb-NO,nb;q=0.9,en;q=0.8",
    }
    response = requests.get(url, headers=headers, cookies=cookies, verify=False, timeout=20)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def main():
    print("Loading browser cookies…")
    cookies = {}
    for loader_name, loader in [("Chrome", browser_cookie3.chrome), ("Safari", browser_cookie3.safari)]:
        try:
            cookie_jar = loader(domain_name="")
            cookies = {c.name: c.value for c in cookie_jar}
            print(f"  Loaded {len(cookies)} cookies from {loader_name}")
            break
        except Exception as e:
            print(f"  {loader_name} failed: {e}")
    if not cookies:
        print("  Continuing without cookies")

    targets = [
        f for f in sorted(RECIPES_DIR.glob("*.md"))
        if has_empty_ingredients(f)
    ]

    # Skip Instagram – can't scrape programmatically
    targets = [f for f in targets if "instagram.com" not in (get_source_url(f) or "")]

    print(f"\nFound {len(targets)} empty recipes to refill\n")

    ok = skipped = errors = 0

    for recipe_file in targets:
        url = get_source_url(recipe_file)
        if not url:
            print(f"  skip (no URL): {recipe_file.name}")
            skipped += 1
            continue

        slug = recipe_file.stem
        print(f"  {slug}")
        print(f"    → {url}")

        try:
            soup = fetch_with_cookies(url, cookies)
            title_tag = soup.find("title")
            title = clean_title(title_tag.text) if title_tag else slug
            ingredients, instructions = scrape_recipe_jsonld(soup)

            if not ingredients:
                print(f"    ✗ no JSON-LD recipe found")
                skipped += 1
                continue

            content = build_recipe_file(slug, title, url, ingredients, instructions)
            recipe_file.write_text(content, encoding="utf-8")
            print(f"    ✓ {len(ingredients)} ingredients, {len(instructions or [])} steps")
            ok += 1

        except Exception as e:
            print(f"    ERROR: {e}")
            errors += 1

    print(f"\nFerdig: {ok} oppdatert, {skipped} hoppet over, {errors} feil")


if __name__ == "__main__":
    main()
