from fastmcp import FastMCP

from scripts.scrape_content import scrape_meta_content

mcp = FastMCP("oppskrifts-server")

@mcp.tool("add-recipe-tool")
def add_recipe(url: str) -> str:
  """
  Legg til en oppskrift fra en gitt URL til oppskriftsdatabasen.

  Du skal legge til en fil _posts mappen i dette repoet : https://github.com/noraroste/recipes/tree/main/
  repoet ligger lokalt i git/recipes mappa

  :param url: URL til oppskriften.

  Du må finne frem tittel, beskrivselse, dato, kategori, tags og bilde-URL fra oppskriften på nettsiden.
  Kategorien skal helst være en av følgende, og du kan bare lage ny hvis ingen passer:
      Accessories, American, AsianFusion, Bread, Filipin, Fish , Indian, Italian, Japanese, Korean, Mexica, Pasta, Pie, Salad, Soup, Stew, TexMex, Thai,

  Det kan gjerne være mer enn en tag dersom det passer. Her skal du helst bruke det som finnes fra før, men du kan legge til.
  all-in-one, aubergine, bbq, bok-choy, bowl, breakfast, breakfast non-knead simple, burger, burrito, capers, chickpeas, citrus, comfort, mushroom , tofu, creamy, easy, egg, fall, fish, fresh, garnish, gochugaru, gochujang, green, guacamole, left-overs, light, maple-syrup, mediterranean, non-knead, non-knead easy, noodles, okonomiyaki, olives, olives,, pancakes, pasta, peanutbutter, puff-pastry, quick comfort, quick, rice, salad, sesame-paste, sicillian, simple, smoky, snack, soup, spicy, summer, sweet-potato, taco, tandoori, texmex, tikka-masala, time-consuming, tofu, traditional, wrap

  Du kan bruke scrape_content funksjonen til å hente ut tittel, beskrivelse og bilde-URL fra nettsiden.

  Når du har generert markdown innholdet vil jeg at du lagrer det i en fil i _posts mappen med navn på formatet ÅÅÅÅ-MM-DD-tittel.md og committer det til repoet med en commit melding som "Add new recipe: Tittel på oppskrift". push deretter endringene til origin main.
  Oppskriften skal være på formatet:

---
title: <Tittel på oppskrift>
date: <Dagens dato>
categories: <Kategori>
tags: <tags>
toc: false
image:
path: <Bilde-URL>
---

## <Tittel på oppskrift>

<Beskrivelse av oppskriften>

[Link to recipe](<url>)

  :return: Bekreftelsesmelding.
  """

  site_title, recipe_description, image_first = scrape_meta_content(url)

if __name__ == "__main__":
  mcp.run(transport="stdio")
