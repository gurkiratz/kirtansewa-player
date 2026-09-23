# Changelog

All notable changes to the Kirtansewa catalog and player. Tags: **[Web]** = React app · **[Scraper]** = Python pipeline.

## 2026-09-23

- **[Web]** Fixed the artist page panning sideways on mobile. Page roots are flex children of `<main>`, and a flex item won't shrink below its content's min-content width — previously hidden by `overflow-hidden`, and exposed once the document became the mobile scroller. Added `min-w-0`, plus `overflow-x: clip` on `body` as a backstop (`clip` rather than `hidden`, which would break the sticky header).
- **[Web]** Media Session artwork now reports the image's real dimensions and MIME type instead of five invented square entries from `96x96` to `512x512` (these images are often 2560x1920, and three artists' are PNG, not JPEG). Aimed at Apple Watch Now Playing showing no thumbnail while the iPhone was fine.
- **[Web]** The page itself now scrolls on mobile instead of a nested container. iOS only honours the tap-the-status-bar gesture on the main frame, so scroll-to-top did nothing before. The header is sticky, the player dock is fixed with its height reserved in the flow, and each page keeps its own scroller from `md` up.
- **[Web]** The artist page scrolls the playing track into view when it isn't already visible — arriving from a search suggestion could otherwise leave it hundreds of rows down.

## 2026-09-22

- **[Web]** Catalog-wide search over all 23,239 tracks and 222 artists, replacing the old in-place artist-name filter.
- **[Web]** Typing 3+ characters opens a YouTube-style suggestion panel under the search bar: track hits grouped by artist (3 each, with per-group "load more" that scrolls the artist into view) and an Artists tab. Arrow keys + Enter navigate it.
- **[Web]** Enter (or "See all results") commits to a full results page at `/?q=…` with Tracks/Artists tabs and grid/list views.
- **[Web]** Picking a track in the dropdown opens that artist's page with the track already playing; picking one on the results page queues just that artist's matching tracks, so the search doubles as a playlist.
- **[Web]** Search runs against `search-index.json`, a build-time index fetched lazily on first use and queried through an in-memory inverted index with an LRU query cache (sub-5 ms per query).
- **[Web]** Extracted reusable `SegmentedTabs`, `ViewToggle`, `TrackItem`, `Highlight`, `PlayingIndicator`, and artist grid/list views now shared by the catalog and search pages.
- **[Web]** Merged the separate mobile and desktop headers into one responsive `AppHeader`. Both used to be mounted at once with their own search bar, so resizing across the `md` breakpoint revealed a stale query; the artist page's track filter is now shared between its mobile and desktop panels for the same reason.
- **[Web]** Hovering a search suggestion no longer hijacks Enter, and the highlight clears when the pointer leaves the list.
- **[Web]** Fixed picking a search result playing the wrong track. Moving between two artists reuses the artist page component, so the previous artist's tracks were still in state when the `?play=` handler ran — it either started the wrong artist's track at that index or, if the index was out of range, silently dropped the request. The loaded detail is now paired with its slug, so it can never be read against the wrong artist.

## 2026-06-02

- **[Web]** Download a single track via the three-dots menu on any track row.
- **[Web]** Download the currently playing track directly from the player dock.
- **[Web]** Multi-select download — switch the artist page into select mode and download up to 50 tracks as one ZIP (`<artist>-<n>-tracks.zip`); "Select all" picks the first 50.
- **[Web]** Added a "Next 50" button in select mode to advance the selection window through long track lists (51–100, 101–150, …) and wrap back to the start.
- **[Web]** Multi-select now tracks chosen tracks by position rather than URL, so artists with duplicate (identical-URL) recordings select and count correctly.
- **[Web]** Download requests now retry once automatically on transient CDN/CORS failures.
- **[Web]** The batch download dialog now lists the names of any tracks that couldn't be downloaded, instead of only a count.
- **[Web]** Upgrade CDN track and image URLs from `http://` to `https://` to prevent mixed-content blocking on the HTTPS site.
- **[Scraper]** Normalize scraped CDN URLs to `https://` so future scrapes don't reintroduce mixed content.

## 2026-05-31

- **[Web]** Fixed shuffle to use a fixed playback order — skipping forward/back and replaying now navigate the same pre-generated sequence instead of re-randomizing on each skip.
- **[Web]** Queue display now matches shuffle playback order; original track order is saved to localStorage and restored when shuffle is turned off.
- **[Web]** Fixed active track highlight on artist page not appearing when shuffle is on.

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
