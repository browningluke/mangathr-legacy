# 📦 Mangathr

[![npm version](https://badge.fury.io/js/mangathr.svg)](https://badge.fury.io/js/mangathr)
[![Known Vulnerabilities](https://snyk.io/test/github/browningluke/mangathr/badge.svg)](https://snyk.io/test/github/browningluke/mangathr)

⚠️ Deprecation Notice: This project has been superseded by [mangathrV2](https://github.com/browningluke/mangathrV2) (written in Go; faster w/ more features). Nothing new will be developed for this. However, an effort will be made to keep everything working.

**mangathr** is a command-line program to download manga chapters from numerous online platforms (See [Plugins](#plugins)). It supports monitoring ongoing manga to check for new chapters. It bundles each chapters with an accompanying ComicInfo.xml for correct numbering in manga readers such as [Komga](https://github.com/gotson/komga).

<p align="center"><img src="https://raw.githubusercontent.com/browningluke/mangathr/master/.github/readme_images/demo.gif" /></p>

&nbsp;

## Features

- Supports downloading and monitoring 7+ different sites.
- Automatically includes `ComicInfo.xml` for use with manga readers.
- Rename and renumber chapters from within the download interface.
- Support for bulk chapter renaming with Regex.

## Installation
    npm install -g mangathr

### Build from source

Ensure you have `npm` and `node` installed and run the following commands:

    $ git clone https://github.com/browningluke/mangathr.git && cd mangathr
    $ npm install
    $ npm run build
    $ npm link


## Usage

    $ mangathr [SUBCOMMAND] [OPTIONS]

When downloading chapters (download or update), chapters will be downloaded into subfolder in current working directory.


### Subcommands

    download <plugin> <query>           Download chapter(s) of a manga
                                        from plugin.
    register <plugin> <query>           Register manga to database for
                                        new chapter checking.
    manage   <delete || list>           Manage the manga currently
                                        registered in the database.
    update                              Check registered manga for new
                                        chapters.


### Options

    -h, --help                          Displays this help text and
                                        exits.
    -y                                  Register manga or download all
                                        chapters without need for user
                                        confirmation.
    --list-plugins                      Prints all available plugins.


## Plugins

- Mangadex
- Cubari
- Guya Reader
- CatManga
- Webtoons
- Mangakakalot
- Mangasushi


### Mangadex

Accepts any search query and returns the closest match. Also accepts Mangdex `title` or `chapter` URLs as query; as well as a `title` ID.

E.g.
- `mangadex.org/title/TITLE_ID`
- `mangadex.org/chapter/CHAPTER_ID`
- `TITLE_ID`

### Cubari

Accepts Imgur, Gist and Mangdex cubari URLs.

E.g.
- `cubari.moe/read/imgur/ID`
- `cubari.moe/read/gist/ID`
- `cubari.moe/read/mangadex/ID`

### Guya Reader

Accepts any site hosting a Guya reader.

E.g
- `guya.moe/read/manga/ID`
- `danke.moe/read/manga/ID`
- `hachirumi.com/read/manga/ID`

### CatManga, Webtoons, Mangakakalot, Mangasushi

Accepts any search term and returns the closest match.
