import pathlib
import re

POSTS_DIR = pathlib.Path(__file__).parent.parent / "_posts"
RECIPES_DIR = pathlib.Path(__file__).parent.parent / "_recipes"

URL_PATTERN = re.compile(r'\[Link to recipe\]\((https?://[^\)]+)\)')
RECIPE_LINK_PATTERN = re.compile(r'\[Se full oppskrift\]')
RECIPE_SLUG_PATTERN = re.compile(r'^recipe_slug:', re.MULTILINE)


def main():
    updated = skipped = no_recipe = 0

    for post in sorted(POSTS_DIR.rglob("*.md")):
        slug = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', post.stem)
        recipe_file = RECIPES_DIR / f"{slug}.md"

        if not recipe_file.exists():
            no_recipe += 1
            continue

        content = post.read_text(encoding='utf-8')

        already_has_slug = RECIPE_SLUG_PATTERN.search(content)
        already_has_link = RECIPE_LINK_PATTERN.search(content)

        if already_has_slug and already_has_link:
            skipped += 1
            continue

        new_content = content

        if not already_has_slug:
            new_content = new_content.replace(
                '\n---\n',
                f'\nrecipe_slug: {slug}\n---\n',
                1
            )

        if not already_has_link:
            new_content = URL_PATTERN.sub(
                lambda m: f'{m.group(0)} | [Se full oppskrift](/recipes/{slug}/)',
                new_content,
                count=1
            )

        if new_content != content:
            post.write_text(new_content, encoding='utf-8')
            print(f"  updated: {post.name}")
            updated += 1
        else:
            skipped += 1

    print(f"\nFerdig: {updated} oppdatert, {skipped} hoppet over, {no_recipe} uten recipe-fil")


if __name__ == "__main__":
    main()
