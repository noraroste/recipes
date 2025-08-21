from datetime import date
from scrape_content import scrape_meta_content


# Define the URL of the website to scrape
url = "https://vegetarentusiast.no/fiestaform"
site_title, recipe_description, image_first = scrape_meta_content(url)

today = date.today()
formatted_date = today.strftime("%Y-%m-%d")
print(f"Title: {site_title}")
file_name = formatted_date + "-" + site_title.replace(" ", "-") + ".md"
print(f"File name: {file_name}")
print(f"Title: {site_title}")
print(f"Description: {recipe_description}")
print(f"Image URL: {image_first}")

