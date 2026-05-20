# [CLAUDE.md](http://CLAUDE.md)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Kirtan (Sikh devotional music) catalog and audio player. Python scrapers pull artist/track data from kirtansewa.net and store it as JSON; a React SPA reads that JSON and provides browsing, playback, and library management.

## Commands

All frontend commands run from `kirtansewa-web/`:

```bash
npm run dev       # start Vite dev server
npm run build     # tsc type-check + Vite production build
npm run lint      # ESLint
npm run preview   # preview production build locally
```

Python scraping (from repo root):

```bash
pip install -r requirements.txt
python scrape_artists.py    # rebuild artists.json master list
python scrape_details.py    # rebuild artists/ directory of per-artist JSONs
```

## Architecture

### Data Pipeline

1. `scrape_artists.py` → `artists.json` (master artist list)
2. `scrape_details.py` → `artists/<slug>.json` (per-artist tracks/metadata)
3. Both JSON outputs are copied to `kirtansewa-web/public/artists/` so Vite serves them statically
4. The app fetches a manifest at runtime to discover available artists

### Frontend (`kirtansewa-web/src/`)

- **Routing**: React Router v7 — `App.tsx` defines routes; pages live in `pages/`
- **State**: Three Zustand stores:
  - `playerStore` — current track, playback state, queue (backed by Howler.js)
  - `libraryStore` — user-saved tracks/playlists
  - `dataStore` — loaded artist/track JSON data
- **Layout**: `layout/` provides Desktop (persistent sidebar) and Mobile (drawer) variants that wrap all pages
- **Audio**: Howler.js handles all playback; the player UI is `components/PlayerDock`
- **Drag & Drop**: `@dnd-kit` used for queue reordering

### Key type contracts (`src/types/`)

`Artist`, `Track`, and `ArtistDetail` are the core interfaces shared between scraped JSON and the React app. Changes to the scraper output shape must be reflected here.

## Stack

| Layer       | Technology                                   |
| ----------- | -------------------------------------------- |
| Frontend    | React 19, TypeScript ~6, Vite 8              |
| Styling     | Tailwind CSS 4 (via `@tailwindcss/vite`)     |
| State       | Zustand 5                                    |
| Audio       | Howler.js 2.2                                |
| Icons       | lucide-react, @icons-pack/react-simple-icons |
| Drag & drop | @dnd-kit/core + sortable                     |
| Scraper     | Python 3, requests, BeautifulSoup4           |
