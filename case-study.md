# Kirtan Sewa Player: A Case Study

A free, dedicated web player for Puratan Gurbani Kirtan, built on top of the recordings lovingly preserved by the team at [kirtansewa.net](https://kirtansewa.net).

> 📷 **Screenshot:** Home screen / artist grid (hero shot)

---

## The Idea

Kirtan Sewa is a free web player for Puratan Gurbani Kirtan. You can browse artists, listen to rare recordings, build a queue, save favorites, and download tracks for offline listening.

The project does not host any audio. Every recording is sourced from and linked directly to kirtansewa.net. The goal was never to copy their collection. It was to give that collection a fast, modern, dedicated listening experience.

## Why I Am Building It

This player grew out of my own deep appreciation for the seva done by the team behind Kirtan Sewa, and my personal love for Puratan Keertan.

The team has spent years collecting, preserving, and sharing Puratan Gurbani Kirtan recordings, photographs, and information about various Kirtaniye, making this treasure of Gurbani accessible to sangat everywhere. All credit for the audio content belongs to them.

I wanted a simple, dedicated way to listen to these recordings. Something that felt like a real music player: quick browsing, a proper queue, shuffle that behaves, playback that survives a locked phone screen, and the ability to take tracks offline. I hope it serves the sangat well.

Since starting the project I have been in contact with the kirtansewa.net team, and we are now collaborating on features and improvements together.

> 📷 **Screenshot:** Artist detail page with track list, play, and shuffle controls

---

## Features

### Browsing and discovery

- Artist catalog scraped from kirtansewa.net, served as static JSON.
- Per-artist pages with bio, photo, and full track list.
- Search within an artist's tracks.
- Favorite artists and tracks.

> 📷 **Screenshot:** Search and favorites in action

### Playback

- Native audio playback with play, pause, skip, seek, and volume.
- Persistent queue with drag and drop reordering.
- Shuffle and repeat modes.
- Buffering state and buffer progress shown in the player.
- Media Session integration so playback controls and album art appear on the iOS lock screen and Control Center, including scrubbing.

> 📷 **Screenshot:** Player dock with queue open

### Playlists and queue

- Build and manage playlists.
- Mobile queue sheet for small screens.
- Add a whole artist's tracks to the queue or a playlist at once.

> 📷 **Screenshot:** Playlist management view

### Downloads

- Download a single track from the three-dots menu on any track row.
- Multi-select mode to pick up to 50 tracks and download them as a single ZIP file, named after the artist.
- Fully client side. No backend is involved in producing the downloads.
- Automatic retry on transient network failures, and a clear list of any tracks that could not be downloaded.

> 📷 **Screenshot:** Multi-select download with the progress dialog

---

## How It Works

The project has two halves: a Python data pipeline and a React single page app.

**Data pipeline (Python)**

1. A scraper builds a master list of artists from kirtansewa.net.
2. A second scraper visits each artist page and produces a per-artist JSON file with tracks, bio, and image.
3. Those JSON files are mirrored into the web app's public folder so they are served as static assets.

**Frontend (React)**

- The app fetches a manifest at runtime to discover available artists, then loads each artist's JSON on demand.
- State is split across small stores: one for the player and queue, one for the user's library, and one for loaded data.
- Audio is handled by the browser's native audio element. The UI is built with Vite, React 19, Tailwind v4.
- I chose Vite and React over a framework like Next.js on purpose. The app is a lightweight, fully client-side SPA with no need for server-side rendering, and a plain Vite build ships to Vercel as static assets, which keeps deployments very fast.

> 📷 **Screenshot:** Architecture diagram (data pipeline to static JSON to React app)

---

## Challenges

The interesting work was less about adding features and more about making the basics genuinely reliable.

### 1. Audio that did not run out of breath

The first version used howler.js (audio library) that kept a fixed internal pool of audio objects. Under normal use that pool filled up and playback would stop working. I removed the library entirely and moved to the browser's native audio element, which gave more direct control over loading, buffering, and teardown, and fixed the exhaustion problem.

### 2. Shuffle that actually behaves

Early shuffle re-randomized the list on every skip, so pressing next or previous never gave a predictable order. I reworked it so shuffle generates one fixed playback order, saves the original order so it can be restored when shuffle is turned off, and keeps the visible queue in sync with what is actually playing.

> 📷 **Screenshot:** Before and after shuffle behavior

### 3. Mixed content on an HTTPS site

Many of the scraped recording links pointed at plain `http://` URLs. On an HTTPS site the browser blocks those as mixed content. I normalized CDN links to `https://` in three places: the scraper output, the stored data, and a runtime safety net in the app, so the issue cannot quietly reappear.

### 4. Cross origin downloads (the hard one)

Downloading audio in the browser means fetching the file as data, which requires the audio host to allow cross origin requests. The recordings sit on a CloudFront and S3 CDN.

The tricky part was that downloads worked for some tracks and failed for others, seemingly at random. The cause was caching behavior: the audio player loads tracks with requests that do not send an Origin header, so the CDN cached responses without the cross origin permission header. Later download requests then received those cached, permission-less responses and were blocked.

The fix has two parts. On the CDN side, the Origin header needs to be part of the cache key so each origin gets its own cached copy. On the app side, downloads now retry once on a transient failure and clearly report any track that still could not be fetched, so a single cache miss does not silently break a batch.

> 📷 **Screenshot:** Failed-track list in the download dialog

### 5. No backend, by design

There is no server in this project. The catalog is static JSON, downloads are produced entirely in the browser, and the audio is never re-hosted. This keeps the project cheap to run, simple to reason about, and respectful of the fact that the recordings belong to kirtansewa.net.

---

## Tech Stack

| Layer         | Technology                         |
| ------------- | ---------------------------------- |
| Frontend      | React 19, TypeScript, Vite         |
| Styling       | Tailwind CSS                       |
| State         | Zustand                            |
| Audio         | Native HTMLAudioElement            |
| Icons         | lucide-react, simple-icons         |
| Drag and drop | dnd-kit                            |
| Scraper       | Python 3, requests, BeautifulSoup4 |
| Hosting       | Vercel                             |

---

## What Is Next

Some of these come from feedback by the kirtansewa.net team and the sangat using the player:

- A visible scrollbar for desktop users who prefer it.
- Global track search across all artists, not just within one.
- Track durations shown beside each recording.
- A way to share a link to a specific track.
- A photo slideshow that changes while you listen.

> 📷 **Screenshot:** Space reserved for upcoming features

---

## Acknowledgements

This project exists because of the incredible seva done by the team behind Kirtan Sewa and their YouTube channel. They have spent years collecting, preserving, and sharing these recordings.

This player is my small way of helping that work reach more people. All credit for the audio content belongs to them, and all mistakes in this project are mine alone.
