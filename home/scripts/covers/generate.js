/**
 * Renders blog cover images from template.html + manifest.json.
 *
 *   node scripts/covers/generate.js                 # all covers
 *   node scripts/covers/generate.js graduation.jpg  # only the listed files
 *
 * Requires Playwright's chromium, which is not a project dependency:
 *   npx playwright install chromium
 */
const fs = require('fs')
const path = require('path')

const HERE = __dirname
const HOME = path.resolve(HERE, '../..')
const OUT_DIR = path.join(HOME, 'static/img/blog/covers')
const BRAND_SVG = path.join(HOME, 'static/img/hertzbeat-brand.svg')

function loadPlaywright() {
  try {
    return require('playwright')
  } catch {
    console.error('playwright not found. Install it first:\n  npx playwright install chromium')
    process.exit(1)
  }
}

async function main() {
  const {chromium} = loadPlaywright()
  const template = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8')
  const brand = fs.readFileSync(BRAND_SVG, 'utf8')
  const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8'))

  const only = process.argv.slice(2)
  const covers = only.length ? manifest.filter(c => only.includes(c.file)) : manifest
  if (!covers.length) {
    console.error(`no manifest entry matched: ${only.join(', ')}`)
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, {recursive: true})
  const browser = await chromium.launch()
  const context = await browser.newContext({viewport: {width: 1800, height: 766}})
  const page = await context.newPage()

  for (const cover of covers) {
    const html = template
        .replace('BRAND_SVG', brand)
        .replace('HEADLINE', cover.headline)
        .replace('KICKER', cover.kicker)
        .replace('--accent: #a86ee0', `--accent: ${cover.accent}`)
        .replace('--accent2: #7fb5e8', `--accent2: ${cover.accent2}`)

    await page.setContent(html, {waitUntil: 'load'})
    // The inlined logo is the one thing that silently disappeared in an earlier
    // revision, so fail loudly rather than shipping a logo-less cover.
    const logoRendered = await page.evaluate(() => {
      const svg = document.querySelector('.brand svg')
      return !!svg && svg.getBoundingClientRect().width > 100
    })
    if (!logoRendered) {
      throw new Error(`logo failed to render for ${cover.file}`)
    }

    await page.screenshot({
      path: path.join(OUT_DIR, cover.file),
      type: 'jpeg',
      quality: 88,
    })
    console.log(`  ${cover.file}`)
  }

  await browser.close()
  console.log(`${covers.length} cover(s) written to static/img/blog/covers/`)
}

main().catch(err => {
  console.error(err.message)
  process.exit(1)
})
