import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist')
const PUBLIC = join(ROOT, 'public')

const SITE_URL = (
  process.env.SITE_URL || 'https://kirtansewa-player.vercel.app'
).replace(/\/$/, '')
const SITE_NAME = 'Kirtan Sewa Player'
const HOME_TITLE = 'Kirtan Sewa Player'
const HOME_DESC =
  'Browse and listen to a vast catalog of Puratan Gurbani Kirtan'
const HOME_IMAGE = `${SITE_URL}/og-image-3-reduced.png`
const HOME_TWITTER_IMAGE = `${SITE_URL}/twitter-image.png`
const DEFAULT_OG_IMAGE = HOME_IMAGE
const DEFAULT_TWITTER_IMAGE = HOME_TWITTER_IMAGE

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function truncate(s, n = 160) {
  const clean = String(s).replace(/\s+/g, ' ').trim()
  if (clean.length <= n) return clean
  return clean.slice(0, n - 1).trimEnd() + '…'
}

function metaBlock({ title, description, url, image, twitterImage }) {
  const safeTitle = esc(title)
  const safeDesc = esc(description)
  const safeUrl = esc(url)
  const safeImg = esc(image)
  const safeTwImg = esc(twitterImage || image)
  return [
    `<title>${safeTitle}</title>`,
    `<meta name="description" content="${safeDesc}" />`,
    `<link rel="canonical" href="${safeUrl}" />`,
    `<meta property="og:type" content="${title === HOME_TITLE ? 'website' : 'profile'}" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${safeTitle}" />`,
    `<meta property="og:description" content="${safeDesc}" />`,
    `<meta property="og:url" content="${safeUrl}" />`,
    `<meta property="og:image" content="${safeImg}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    `<meta name="twitter:description" content="${safeDesc}" />`,
    `<meta name="twitter:image" content="${safeTwImg}" />`,
  ].join('\n    ')
}

function injectMeta(shell, meta) {
  // Replace the existing <title>…</title> with our meta block; if absent, inject before </head>.
  if (/<title>[\s\S]*?<\/title>/.test(shell)) {
    return shell.replace(/<title>[\s\S]*?<\/title>/, meta)
  }
  return shell.replace(/<\/head>/i, `    ${meta}\n  </head>`)
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('[prerender] dist/ not found — run vite build first')
    process.exit(1)
  }

  const shell = await readFile(join(DIST, 'index.html'), 'utf8')
  const artists = JSON.parse(
    await readFile(join(PUBLIC, 'artists.json'), 'utf8'),
  )
  const manifest = JSON.parse(
    await readFile(join(PUBLIC, 'artists/manifest.json'), 'utf8'),
  )
  const manifestBySlug = new Map(manifest.map((e) => [e.slug, e]))

  // Home
  const homeHtml = injectMeta(
    shell,
    metaBlock({
      title: HOME_TITLE,
      description: HOME_DESC,
      url: `${SITE_URL}/`,
      image: HOME_IMAGE,
      twitterImage: HOME_TWITTER_IMAGE,
    }),
  )
  await writeFile(join(DIST, 'index.html'), homeHtml)

  // Per-artist
  const sitemapUrls = [`${SITE_URL}/`]
  let prerendered = 0
  let skipped = 0

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i]
    const m = manifestBySlug.get(artist.slug)
    if (!m) {
      skipped++
      continue
    }

    const filename = `${String(i + 1).padStart(2, '0')}-${artist.slug}.json`
    const detailPath = join(PUBLIC, 'artists', filename)
    if (!existsSync(detailPath)) {
      skipped++
      continue
    }

    let bio = ''
    try {
      const detail = JSON.parse(await readFile(detailPath, 'utf8'))
      bio =
        Array.isArray(detail.body) && detail.body.length > 0
          ? detail.body[0]
          : ''
    } catch {}

    const trackWord = m.track_count === 1 ? 'track' : 'tracks'
    const description = bio
      ? truncate(bio)
      : `Listen to Kirtan by ${artist.name} on Kirtan Sewa — ${m.track_count} ${trackWord}.`

    const url = `${SITE_URL}/artist/${artist.slug}`
    const html = injectMeta(
      shell,
      metaBlock({
        title: `${artist.name} — Kirtan Sewa`,
        description,
        url,
        image: m.image_url || DEFAULT_OG_IMAGE,
        twitterImage: m.image_url || DEFAULT_TWITTER_IMAGE,
      }),
    )

    const outDir = join(DIST, 'artist', artist.slug)
    await mkdir(outDir, { recursive: true })
    await writeFile(join(outDir, 'index.html'), html)
    sitemapUrls.push(url)
    prerendered++
  }

  // sitemap.xml
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapUrls.map((u) => `  <url><loc>${esc(u)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n')
  await writeFile(join(DIST, 'sitemap.xml'), sitemap)

  // robots.txt
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`
  await writeFile(join(DIST, 'robots.txt'), robots)

  console.log(
    `[prerender] home + ${prerendered} artist pages (skipped ${skipped} unscraped), sitemap.xml, robots.txt`,
  )
}

main().catch((err) => {
  console.error('[prerender] failed:', err)
  process.exit(1)
})
