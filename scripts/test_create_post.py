import importlib.util, pathlib
from bs4 import BeautifulSoup

spec = importlib.util.spec_from_file_location(
    'create_post_from_url',
    pathlib.Path(__file__).parent / 'create-post-from-url.py'
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
title_to_slug = mod.title_to_slug
output_path = mod.output_path
normalize_tags = mod.normalize_tags
build_image_block = mod.build_image_block
build_recipe_file = mod.build_recipe_file

import importlib.util as _ilu
_scrape_spec = _ilu.spec_from_file_location('scrape_content', pathlib.Path(__file__).parent / 'scrape_content.py')
_scrape_mod = _ilu.module_from_spec(_scrape_spec)
_scrape_spec.loader.exec_module(_scrape_mod)
scrape_recipe_jsonld = _scrape_mod.scrape_recipe_jsonld


def test_lowercase():
    assert title_to_slug('Lentil Bolognese') == 'lentil-bolognese'


def test_collapses_multiple_dashes():
    assert title_to_slug('Lentil Bolognese---Rainbow Plant Life') == 'lentil-bolognese-rainbow-plant-life'


def test_removes_source_after_double_dash():
    assert title_to_slug('Thai Green Curry -- Rainbow Plant Life') == 'thai-green-curry-rainbow-plant-life'


def test_norwegian_characters():
    assert title_to_slug('Grønnsakslasagne') == 'gronnsakslasagne'


def test_spaces_become_dashes():
    assert title_to_slug('quick garlic chili noodles') == 'quick-garlic-chili-noodles'


def test_output_path_includes_year_subfolder():
    assert output_path('../_posts/', '2026-03-26') == '../_posts/2026/'


def test_normalize_tags_lowercases():
    assert normalize_tags('[Quick, Easy]') == '[quick, easy]'

def test_normalize_tags_replaces_spaces_with_dashes():
    assert normalize_tags('[Sweet Potato, comfort]') == '[sweet-potato, comfort]'

def test_normalize_tags_deduplicates():
    assert normalize_tags('[tofu, tofu, easy]') == '[tofu, easy]'

def test_normalize_tags_strips_whitespace():
    assert normalize_tags('[  quick ,  easy  ]') == '[quick, easy]'


def test_image_block_with_url():
    assert build_image_block('https://example.com/img.jpg') == 'image:\n  path: https://example.com/img.jpg\n'

def test_image_block_without_url():
    assert build_image_block(None) == ''


JSONLD_HTML = """<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Test Recipe",
  "recipeIngredient": ["200g pasta", "2 cloves garlic"],
  "recipeInstructions": [
    {"@type": "HowToStep", "text": "Kok pasta."},
    "Stek hvitløk."
  ]
}
</script></head><body></body></html>"""

JSONLD_GRAPH_HTML = """<html><head>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "WebPage", "name": "Some page"},
    {
      "@type": "Recipe",
      "recipeIngredient": ["1 løk"],
      "recipeInstructions": ["Hakk løk."]
    }
  ]
}
</script></head><body></body></html>"""


def test_jsonld_extracts_ingredients_and_instructions():
    soup = BeautifulSoup(JSONLD_HTML, 'html.parser')
    ingredients, instructions = scrape_recipe_jsonld(soup)
    assert ingredients == ["200g pasta", "2 cloves garlic"]
    assert instructions == ["Kok pasta.", "Stek hvitløk."]


def test_jsonld_graph_format():
    soup = BeautifulSoup(JSONLD_GRAPH_HTML, 'html.parser')
    ingredients, instructions = scrape_recipe_jsonld(soup)
    assert ingredients == ["1 løk"]
    assert instructions == ["Hakk løk."]


def test_jsonld_returns_none_when_missing():
    soup = BeautifulSoup("<html><body></body></html>", 'html.parser')
    ingredients, instructions = scrape_recipe_jsonld(soup)
    assert ingredients is None
    assert instructions is None


def test_build_recipe_file_auto():
    result = build_recipe_file("test-slug", "Test", "https://example.com", ["1 egg"], ["Kok egg."])
    assert 'status: auto' in result
    assert '- "1 egg"' in result
    assert '- "Kok egg."' in result


def test_build_recipe_file_template():
    result = build_recipe_file("test-slug", "Test", "https://example.com", None, None)
    assert 'status: template' in result
    assert 'Legg til ingredienser' in result
