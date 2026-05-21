# Changelog

All notable changes to the Kirtansewa catalog and player. Tags: **[Web]** = React app · **[Scraper]** = Python pipeline.

## 2026-05-21

- **[Web]** Reduced OG image size for faster social previews.

## 2026-05-20

- **[Web]** Removed Howler.js in favor of native `HTMLAudioElement` (fixes audio pool exhaustion under normal use).
- **[Web]** Added buffering state and buffer-progress color to PlayerDock.
- **[Web]** Position state now reported to Media Session so iOS lock-screen scrubbing works.
- **[Web]** Added prerendered meta tags for richer link unfurls.
- **[Web]** Implemented client-side cache for artist/track JSON.

## 2026-05-15

- **[Web]** Restore scroll position when returning to the artist grid.
- **[Web]** Show artist photo on iOS lock screen and Control Center.

## 2026-04-24

- **[Web]** Enhanced search across artists and tracks.
- **[Web]** Added favorite icon to tracks.
- **[Web]** Lazy-loaded artist images.
- **[Scraper]** Added new artists to the catalog.

## 2026-04-15

- **[Web]** Improved queue UX.
- **[Web]** Moved shuffle from PlayerDock to ArtistDetail.
- **[Web]** Added navigation from player to artist page.
- **[Web]** Hid GitHub link (temporary).

## 2026-04-14

- **[Web]** Playlist improvements.
- **[Web]** Improved sorting UI.
- **[Web]** Fixed Vercel deployment.

## 2026-04-12

- **[Web]** Playlist management features and animations.

## 2026-04-11

- **[Web]** App layout redesign; redesigned queue and player.
- **[Web]** New waveform player component in PlayerDock.
- **[Web]** Mobile queue sheet component.
- **[Web]** Touch-sensor support for queue drag-and-drop.
- **[Web]** iOS Safari auto-zoom prevention; PlayerDock init and ArtistDetail layout improvements.
- **[Web]** Fix: unload Howl on track end to prevent HTML5 audio pool exhaustion (later superseded by Howler removal).
- **[Web]** Updated page title and layout components; updated About page.
- **[Scraper]** Added command-line argument parsing to `scrape_details.py`.
- **[Scraper]** Refactored artist manifest generation and data structure.
- **[Scraper]** Added artist-manifest update and JSON mirroring into `kirtansewa-web/public/`.

## 2026-04-07

- **[Web]** Initial web app and prototype design.

## Earlier

- **[Scraper]** Initial Python scraper for kirtansewa.net (artists + per-artist details).
