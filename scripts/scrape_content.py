import requests
import urllib3
from bs4 import BeautifulSoup

from select_image import find_first_image

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def scrape_meta_content(url):
  try:
    # Send an HTTP GET request to the URL
    response = requests.get(url, verify=False)
    response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')

    title = soup.find('title')
    print(f"Title: {title.text}")

    description = soup.find('meta', attrs={'name': 'description'})

    if description:
      content = description.get('content')
      print(f'Description: {content}')

    image = find_first_image(soup, url)
    print(f"Image URL: {image}")

  except requests.exceptions.RequestException as e:
    print(f"Error fetching the URL: {e}")
  except Exception as e:
    print(f"An error occurred: {e}")

  return title.text, content, image
