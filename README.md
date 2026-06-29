# Chobble Client Site Builder

Quick static site generator that combines the [Chobble Template](https://git.chobble.com/chobble/chobble-template/) with your content.

## Quick Start

1. **Add your content** - Edit markdown files and images in the relevant folders
2. **Push to GitHub** - The site builds automatically via GitHub Actions
3. **Deploy happens automatically** - Site deploys to Bunny CDN (staging for branches, production for `main`)

## What Goes Where

The `.pages.yml` defines all your content types:
- `pages/` - Static pages with navigation
- `news/` - Blog posts with dates
- `products/` - Shop items with prices and Etsy links
- `categories/` - Product categories
- `team/` - Team member profiles
- `reviews/` - Customer testimonials
- `events/` - Upcoming events
- `menus/`, `menu-categories/`, `menu-items/` - Restaurant menu system
- `snippets/` - Reusable content bits
- `images/` - All your images

## How It Works

When you push to GitHub:
1. GitHub Actions merges your content with the template
2. Builds the static site with Eleventy
3. Deploys to Bunny CDN

## Configuration

Set these GitHub secrets for your repo:
- `BUNNY_ACCESS_KEY`, `BUNNY_PRODUCTION_*` / `BUNNY_STAGING_*` (storage zone name, password, pull zone ID) - For deployment
- `FORMSPARK_ID` - For contact forms (optional)
- `BOTPOISON_PUBLIC_KEY` - For spam protection (optional)
- `INDEXNOW_KEY` - For IndexNow search submission (optional)
- `NTFY_TOPIC` - For build-failure notifications (optional)

## Local Development

This project uses [Bun](https://bun.sh). The Chobble Template is vendored as the
`chobble-template` git submodule, which provides the `@chobble/js-toolkit`
dependency and the Eleventy build.

```bash
git submodule update --init   # populate chobble-template (first checkout only)
bun install                   # install dependencies
bun run serve                 # dev server with hot reload
bun run build                 # build the site into _site/
bun run test                  # run the template test suite
```

Cloning with `git clone --recurse-submodules` initialises the submodule for you.
If `bun install` fails with `ENOENT ... @chobble/js-toolkit`, the submodule
hasn't been checked out yet - run the `git submodule update --init` step above.