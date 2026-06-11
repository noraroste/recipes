import json
import requests
import urllib3
from bs4 import BeautifulSoup
from urllib.parse import quote

from select_image import find_first_image

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def scrape_meta_content(url, debug=False):
  # Add browser-like headers
  headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com/'
  }
  try:
    # Send an HTTP GET request to the URL
    response = requests.get(url, headers=headers, verify=False)
    response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')

    title = soup.find('title')
    if debug:
      print(f"Title: {title.text}")

    description = soup.find('meta', attrs={'name': 'description'})
    content = ''
    if description:
      content = description.get('content')
      if debug:
        print(f'Description: {content}')


    image = find_first_image(soup, debug)
    if debug:
      print(f"Image URL: {image}")
    # URL encode the image URL to handle special characters
    if image:
      encoded_image = quote(image, safe='/:?=&')
      print(f"Encoded image URL: {encoded_image}")
    else:
      encoded_image = None

  except requests.exceptions.RequestException as e:
    print(f"Error fetching the URL: {e}")
  except Exception as e:
    print(f"An error occurred: {e}")

  ingredients, instructions = scrape_recipe_jsonld(soup, debug)

  return title.text, content, encoded_image, ingredients, instructions


def scrape_recipe_jsonld(soup, debug=False):
  for script in soup.find_all('script', type='application/ld+json'):
    try:
      data = json.loads(script.string)
    except (json.JSONDecodeError, TypeError):
      continue

    recipe = None
    if isinstance(data, dict):
      if data.get('@type') == 'Recipe':
        recipe = data
      elif '@graph' in data:
        recipe = next((item for item in data['@graph'] if item.get('@type') == 'Recipe'), None)
    elif isinstance(data, list):
      recipe = next((item for item in data if item.get('@type') == 'Recipe'), None)

    if recipe:
      raw_ingredients = recipe.get('recipeIngredient') or []
      ingredients = [raw_ingredients] if isinstance(raw_ingredients, str) else raw_ingredients
      raw_instructions = recipe.get('recipeInstructions') or []
      instructions = [
        item['text'] if isinstance(item, dict) else item
        for item in raw_instructions
      ]
      if debug:
        print(f"JSON-LD: found {len(ingredients)} ingredients, {len(instructions)} steps")
      return ingredients, instructions

  return None, None
