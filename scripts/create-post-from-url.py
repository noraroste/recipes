from datetime import date
import argparse

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

def main():
  # Create argument parser
  parser = argparse.ArgumentParser(description='Create a blog post from a URL')
  parser.add_argument('--input-file', help='Path to input file containg url, categories and tags', default=None)
  parser.add_argument('--url', help='URL of the website to scrape', default=None)
  parser.add_argument('--categories', default='[]', help='Categories in format "[Cat1, Cat2]"')
  parser.add_argument('--tags', default='[]', help='Tags in format "[tag1, tag2]"' )
  parser.add_argument('--output-path', default='../_posts/', help='Path to save the markdown file')

  # Parse arguments
  args = parser.parse_args()

  # Use the parsed values
  input_file = args.input_file
  url = args.url
  categories = args.categories
  tags = args.tags
  path = args.output_path

  if input_file:
    with open(input_file, 'r', encoding='utf-8') as file:
      lines = file.readlines()
      url = lines[0].strip()
      categories = lines[1].strip()
      tags = lines[2].strip()

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
  markdown_content = \
    f"""---
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
  # Write the markdown content to a file
  with open(path + file_name, 'w', encoding='utf-8') as file:
      file.write(markdown_content)


if __name__ == "__main__":
  main()
