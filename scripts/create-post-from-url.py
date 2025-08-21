import requests
from bs4 import BeautifulSoup

# Define the URL of the website to scrape
url = "https://vegetarentusiast.no/fiestaform/?utm_source=Vegetarentusiaster&utm_campaign=0fad830701-EMAIL_CAMPAIGN_2023_01_30_09_31_COPY_01&utm_medium=email&utm_term=0_-0bccbf1f60-[LIST_EMAIL_ID]&mc_cid=0fad830701&mc_eid=ba0f254d92" # Example URL

try:
    # Send an HTTP GET request to the URL
    response = requests.get(url)
    response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')

    title = soup.find('title')
    print(f"Title: {title.text}")

    description = soup.find('meta', attrs={'name': 'description'})

    if description:
        content = description.get('content')
        print(f'Description: {content}')

except requests.exceptions.RequestException as e:
    print(f"Error fetching the URL: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
