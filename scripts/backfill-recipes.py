import importlib.util
import re
import pathlib

_spec = importlib.util.spec_from_file_location(
    'create_post_from_url',
    pathlib.Path(__file__).parent / 'create-post-from-url.py'
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
build_recipe_file = _mod.build_recipe_file
title_to_slug = _mod.title_to_slug
clean_title = _mod.clean_title

from scrape_content import scrape_meta_content

POSTS_DIR = pathlib.Path(__file__).parent.parent / "_posts"
RECIPES_DIR = pathlib.Path(__file__).parent.parent / "_recipes"

URL_PATTERN = re.compile(r'\[Link to recipe\]\((https?://[^\)]+)\)')

def extract_url(post_path):
    content = post_path.read_text(encoding='utf-8')
    match = URL_PATTERN.search(content)
    return match.group(1) if match else None

def main():
    import sys
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    RECIPES_DIR.mkdir(exist_ok=True)
    posts = sorted(POSTS_DIR.rglob("*.md"))
    if limit:
        posts = posts[:limit]

    total = skipped = auto = template = errors = 0

    for post in posts:
        url = extract_url(post)
        if not url:
            skipped += 1
            continue

        slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', post.stem)
        recipe_file = RECIPES_DIR / f"{slug}.md"

        if recipe_file.exists():
            print(f"  skip (exists): {slug}")
            skipped += 1
            continue

        total += 1
        print(f"  scraping: {url}")
        try:
            title, _, _, ingredients, instructions = scrape_meta_content(url)
            cleaned_title = clean_title(title)
            content = build_recipe_file(slug, cleaned_title, url, ingredients, instructions)
            recipe_file.write_text(content, encoding='utf-8')
            status = "auto" if ingredients else "template"
            print(f"    → {status}: {recipe_file.name}")
            if ingredients:
                auto += 1
            else:
                template += 1
        except Exception as e:
            print(f"    ERROR: {e}")
            errors += 1

    print(f"\nFerdig: {auto} auto, {template} template, {errors} feil, {skipped} hoppet over")

if __name__ == "__main__":
    main()
