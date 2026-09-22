/**
 * Builds public/search-index.json — a single compact payload the app fetches
 * once (lazily, on first search) instead of pulling all 222 per-artist JSONs.
 *
 * Shape is columnar and short-keyed to keep the download small:
 *   { v, a: [{ s: slug, n: name, f: file, i: imageUrl }], t: [[trackName, ...], ...] }
 *
 * `t[i]` is parallel to `a[i]`, and the position of a name inside `t[i]` is that
 * track's index in the artist's own `tracks` array — so a search hit maps back
 * to a playable URL without the index having to carry every mp3 link.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = join(__dirname, '..', 'public')
const ARTISTS_DIR = join(PUBLIC, 'artists')
const OUT = join(PUBLIC, 'search-index.json')

const FILE_RE = /^(\d+)-(.+)\.json$/
const SEP = ' – ' // en dash used by the source site between artist and title

function stripArtistPrefix(name) {
  return name.includes(SEP) ? name.split(SEP).slice(1).join(SEP) : name
}

async function main() {
  const files = (await readdir(ARTISTS_DIR))
    .filter((f) => FILE_RE.test(f))
    .sort()

  const artists = []
  const tracks = []

  for (const file of files) {
    const slug = file.match(FILE_RE)[2]
    const data = JSON.parse(await readFile(join(ARTISTS_DIR, file), 'utf-8'))
    artists.push({
      s: slug,
      n: data.name,
      f: file,
      i: data.image_url ?? null,
    })
    tracks.push((data.tracks ?? []).map((t) => stripArtistPrefix(t.name)))
  }

  const payload = { v: 1, a: artists, t: tracks }
  await writeFile(OUT, JSON.stringify(payload), 'utf-8')

  const total = tracks.reduce((n, list) => n + list.length, 0)
  const bytes = JSON.stringify(payload).length
  console.log(
    `search-index.json: ${artists.length} artists, ${total} tracks, ${(bytes / 1024 / 1024).toFixed(2)} MB`
  )
}

main()
