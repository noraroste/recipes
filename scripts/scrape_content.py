import requests
import urllib3
from bs4 import BeautifulSoup

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def find_first_image(soup, url):
  # Find the first image in the main content area
  # Try to find a main tag first
  main_content = soup.find('main')
  # If main tag doesn't exist, try common container classes
  if not main_content:
    main_content = soup.find('div', class_=['main', 'content', 'main-content', 'container'])

  # If we found a main content area, search for images within it
  if main_content:
    first_image = main_content.find('img')
    if first_image:
      image_url = first_image.get('src')
      # If the image URL is relative, make it absolute
      if image_url and not image_url.startswith(('http://', 'https://')):
        image_url = requests.compat.urljoin(url, image_url)
      print(f"First image in main content: {image_url}")
      return image_url
    else:
      print("No images found in main content")
  else:
    print("No main content area found, searching the entire page for images")
    # Find the first image on the page
    first_image = soup.find('img')
    if first_image:
      image_url = first_image.get('src')
      # If the image URL is relative, make it absolute
      if image_url and not image_url.startswith(('http://', 'https://')):
        image_url = requests.compat.urljoin(url, image_url)
      # print(f"First image URL: {image_url}")
      return image_url
    else:
      print("No images found on the page")

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
