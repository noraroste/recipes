# Velkommen til Recipes

Dette prosjektet inneholder en samling av oppskrifter. 

##  Legge til oppskrifter
Oppskrifter kan legges til via skriptet `create-post-from-url.py` ved sende inn en url som parameter, samt hvilken kategori oppskriften skal legges til i, og hvilke tags oppskriften skal ha.
Skriptet vil hente tittel, bilde og beskrivelse fra siden, og lage en markdown-fil i `_posts`-mappen som en post som vil vises på siden når den er deployet.
eksempel på bruk:
```
python3 create-post-from-url.py --url <url til oppskrift> --categories <kategori> --tags <tag1,tag2,...>
```

Oppskrifter kan også legges til ved bruk av github actions. Dette gjøres ved å legge til en txt fil i `add-new-posts-here` mappen i formatet:
```
<url til oppskrift>
[<kategori>]
[<tag1>, <tag2>, ...]
```
når endringen pushes, vil skriptet kjøres og posten opprettes, og prosjektet deployes.

## Kjøre opp prosjektet lokalt

``` bundle exec jekyll serve --baseurl /```

## Credits

Dette prosjektet er bygd ved hjelp av [Chirpy Starter][chirpy]. 

[![Gem Version](https://img.shields.io/gem/v/jekyll-theme-chirpy)][gem]&nbsp;
[![GitHub license](https://img.shields.io/github/license/cotes2020/chirpy-starter.svg?color=blue)][mit]



[gem]: https://rubygems.org/gems/jekyll-theme-chirpy
[chirpy]: https://github.com/cotes2020/jekyll-theme-chirpy/
[mit]: https://github.com/cotes2020/chirpy-starter/blob/master/LICENSE
