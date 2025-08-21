from datetime import date
from unicodedata import category

from scrape_content import scrape_meta_content

import re

def clean_title(title):
  # Replace Norwegian characters with Latin equivalents
  replacements = {
    'æ': 'ae', 'ø': 'o', 'å': 'a',
    'Æ': 'Ae', 'Ø': 'O', 'Å': 'A'
  }

  for char, replacement in replacements.items():
    title = title.replace(char, replacement)

  # Remove other special characters that could cause issues in filenames
  title = re.sub(r'[^\w\s-]', '', title)

  return title

# Define the URL of the website to scrape
url = "https://lindastuhaug.no/alt-ett-krema-kyllinggryte-med-quinoa"
categories = "[Recipes, Stew]"
tags = "[quick, creamy, all-in-one]"

site_title, recipe_description, image_first = scrape_meta_content(url)

cleaned_title = clean_title(site_title)
today = date.today()
formatted_date = today.strftime("%Y-%m-%d")
file_name = formatted_date + "-" + cleaned_title.replace(" ", "-") + ".md"
print(f"File name: {file_name}")
print(f"Title: {cleaned_title}")
print(f"Description: {recipe_description}")
print(f"Image URL: {image_first}")

# Create the markdown content
markdown_content = f"""---
title: {cleaned_title}
date: {formatted_date}
categories: {categories}
tags: {tags}
toc: false
image:
  path: {image_first}
---
# {cleaned_title}
{recipe_description}

[Link to recipe]({url})

"""
path = "../_posts/"
# Write the markdown content to a file
with open(path + file_name, 'w', encoding='utf-8') as file:
    file.write(markdown_content)

