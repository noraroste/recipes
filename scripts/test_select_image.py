from bs4 import BeautifulSoup
from select_image import find_first_image


def make_soup(html):
    return BeautifulSoup(html, 'html.parser')


def test_falls_back_to_img_tag_when_no_og_image():
    soup = make_soup('''
        <html>
        <body>
            <img src="https://example.com/recipe.jpg" />
        </body>
        </html>
    ''')
    assert find_first_image(soup) == 'https://example.com/recipe.jpg'


def test_returns_og_image_when_present():
    soup = make_soup('''
        <html>
        <head>
            <meta property="og:image" content="https://example.com/recipe.jpg" />
        </head>
        <body></body>
        </html>
    ''')
    assert find_first_image(soup) == 'https://example.com/recipe.jpg'
