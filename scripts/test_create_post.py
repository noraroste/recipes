import importlib.util, pathlib
spec = importlib.util.spec_from_file_location(
    'create_post_from_url',
    pathlib.Path(__file__).parent / 'create-post-from-url.py'
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
title_to_slug = mod.title_to_slug


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
