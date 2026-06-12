"""Migrate recipe files from YAML lists to markdown content."""
import os
import re
import yaml

RECIPES_PATH = os.path.join(os.path.dirname(__file__), '..', '_recipes')

def parse_file(path):
  with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
  match = re.match(r'^---\n(.*?)\n---\s*\n?(.*)', content, re.DOTALL)
  if not match:
    return None, None
  try:
    fm = yaml.safe_load(match.group(1))
  except yaml.YAMLError:
    return None, None
  body = match.group(2).strip()
  return fm, body

def build_markdown(fm, body):
  frontmatter_keys = ['title', 'source_url', 'status', 'servings']
  fm_lines = []
  for key in frontmatter_keys:
    if key in fm and fm[key] is not None and fm[key] != '':
      fm_lines.append(f'{key}: {fm[key]}')

  if body:
    md_content = body
  else:
    ingredients = fm.get('ingredients') or []
    instructions = fm.get('instructions') or []
    notes = fm.get('notes', '')

    if ingredients:
      ing_md = '\n'.join(f'- {i}' for i in ingredients)
    else:
      ing_md = '- Legg til ingredienser her'

    if instructions:
      ins_md = '\n'.join(f'{n+1}. {s}' for n, s in enumerate(instructions))
    else:
      ins_md = '1. Legg til fremgangsmåte her'

    md_content = f'## Ingredienser\n\n{ing_md}\n\n## Fremgangsmåte\n\n{ins_md}'
    if notes:
      md_content += f'\n\n## Notater\n\n{notes}'

  return f'---\n' + '\n'.join(fm_lines) + f'\n---\n\n{md_content}\n'

def migrate():
  files = [f for f in os.listdir(RECIPES_PATH) if f.endswith('.md')]
  migrated = 0
  skipped = 0
  for filename in sorted(files):
    path = os.path.join(RECIPES_PATH, filename)
    fm, body = parse_file(path)
    if fm is None:
      print(f'SKIP (no frontmatter): {filename}')
      skipped += 1
      continue
    if 'ingredients' not in fm and body:
      print(f'SKIP (already markdown): {filename}')
      skipped += 1
      continue
    new_content = build_markdown(fm, body)
    with open(path, 'w', encoding='utf-8') as f:
      f.write(new_content)
    migrated += 1
    print(f'OK: {filename}')
  print(f'\nMigrated: {migrated}, skipped: {skipped}')

if __name__ == '__main__':
  migrate()
