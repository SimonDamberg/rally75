// Regenerates the PWA / home-screen icons in public/. Run once; the PNGs are committed.
//
//   npm run icons            all of them
//   npm run icons -- guest   only the Mr Green guest set, leaving the gm-* PNGs alone
//
// The guest set is the Mr Green umbrella brand and is drawn from public/mrgreen-logo.jpg; the GM
// set stays Rally75 (the 75 plate). Headless screenshots are not byte-identical between runs, so
// pass "guest" when only the guest brand changed and the GM diff should stay clean.
//
// The icons are rendered by Playwright's cached chrome-headless-shell (no ImageMagick or
// rsvg-convert on this Mac) with the real Big Shoulders Display woff2 inlined as a data URI, so
// the brand numerals are baked into the PNG and the icon has no font dependency. sips then
// downsizes. .mjs on purpose: tsconfig.node.json and eslint only match scripts/**/*.ts, so this
// adds no typecheck or lint surface and never enters the Vite build.
//
// If the chrome-headless-shell path below is gone, reinstall it with:
//   npx playwright-core install chromium-headless-shell
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir, tmpdir } from 'node:os'

const REPO = process.cwd()
const OUT = join(REPO, 'public')
const TMP = join(tmpdir(), 'rally75-icons')
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

const CHROME = join(
  homedir(),
  'Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',
)
if (!existsSync(CHROME)) {
  console.error(`icons: no chrome-headless-shell at ${CHROME}\nRun: npx playwright-core install chromium-headless-shell`)
  process.exit(2)
}

const font = readFileSync(
  join(REPO, 'node_modules/@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2'),
).toString('base64')

// Inlined the same way as the font: the source filename would otherwise need percent-encoding in a
// file:// URL, and a data URI sidesteps that entirely.
const art = readFileSync(join(REPO, 'public/mrgreen-logo.jpg')).toString('base64')
const ART = `data:image/jpeg;base64,${art}`

// Only the guest set when asked, so a guest-brand change cannot rewrite the GM PNGs.
const guestOnly = process.argv[2] === 'guest'

// Tokens from src/index.css @theme.
const NIGHT = '#07123a'
const NIGHT_DEEP = '#040b26'
const PLATE = '#ffd60a'
const SLEAZE = '#ff2e88'
// The felt green the supplied artwork sits on, so letterboxing it is invisible.
const FELT = '#033317'

/**
 * The signature mark: the slanted 75 plate (skewX(-10deg), digits un-skewed) with the pink
 * offset shadow. Kept inside ~60% of the canvas so it survives a maskable circle crop.
 */
function page({ ground, plate, digits, shadow, scale = 1 }) {
  return `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"BS";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:512px;height:512px}
body{display:grid;place-items:center;background:${ground};font-family:"BS",sans-serif}
.plate{transform:skewX(-10deg) scale(${scale});background:${plate};color:${digits};
  box-shadow:0.07em 0.07em 0 ${shadow};border-radius:26px;
  padding:14px 30px 26px;font-weight:900;font-size:250px;line-height:0.86}
.plate span{display:inline-block;transform:skewX(10deg);letter-spacing:-0.02em}
</style><div class="plate"><span>75</span></div>`
}

/**
 * The Mr Green guest mark: the frog's head cropped out of the full lockup. Same framing numbers as
 * MrGreenLogo's "mark" variant in src/ui, so the icon and the app header show the same crop. scale
 * shrinks the mark inside a felt margin instead of zooming out, so the maskable pair keeps the whole
 * head rather than letting Android's circle crop eat the hat.
 */
function pageArt({ scale = 1 }) {
  return `<!doctype html><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:512px;height:512px}
body{display:grid;place-items:center;background:${FELT}}
.mark{width:${Math.round(512 * scale)}px;height:${Math.round(512 * scale)}px;
  background:url("${ART}") no-repeat;background-size:274% auto;background-position:49% 0}
</style><div class="mark"></div>`
}

// The GM console gets the inverse so the two home-screen icons are told apart at a glance.
const GM = { ground: `radial-gradient(120% 80% at 50% 0%, #ff5ba6 0%, ${SLEAZE} 55%, #9e0f4f 100%)`, plate: PLATE, digits: NIGHT, shadow: NIGHT_DEEP }
// Android masks icons to a circle and keeps only the inner ~80%, so the maskable pair shrinks
// the plate to fit that safe zone; the full-bleed pair stays edge to edge for everything else.
const MASK_SCALE = 0.72

const VARIANTS = [
  { prefix: 'icon', html: pageArt({}) },
  { prefix: 'gm-icon', html: page(GM) },
  { prefix: 'icon-maskable', html: pageArt({ scale: MASK_SCALE }), maskable: true },
  { prefix: 'gm-icon-maskable', html: page({ ...GM, scale: MASK_SCALE }), maskable: true },
].filter((v) => !guestOnly || !v.prefix.startsWith('gm-'))

// Link preview when the join URL is pasted into a group chat. The full lockup, contained rather
// than cropped: the wordmark is the whole point here, and the felt matches the art's own ground so
// the letterboxing does not show.
const OG = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"BS";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  background:${FELT};font-family:"BS",sans-serif;color:#f4faf3;padding:28px 0 34px}
img{height:440px;width:auto;border-radius:22px}
.tag{font-size:46px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7fe3b1}
</style><img src="${ART}" alt="">
<div class="tag">Trav, skrap och andra sätt att bli av med pengar</div>`

const ogHtml = join(TMP, 'og.html')
writeFileSync(ogHtml, OG)
execFileSync(CHROME, [
  '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--screenshot=${join(OUT, 'og.png')}`, '--window-size=1200,630', `file://${ogHtml}`,
], { stdio: 'ignore' })
console.log('rendered og')

for (const v of VARIANTS) {
  const htmlPath = join(TMP, `${v.prefix}.html`)
  writeFileSync(htmlPath, v.html)
  const big = join(OUT, `${v.prefix}-512.png`)
  execFileSync(CHROME, [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--screenshot=${big}`,
    '--window-size=512,512',
    `file://${htmlPath}`,
  ], { stdio: 'inherit' })

  const sizes = [[`${v.prefix}-192.png`, 192]]
  // iOS never masks the apple-touch-icon, so only the full-bleed pair needs one.
  if (!v.maskable) sizes.push([`${v.prefix === 'icon' ? 'apple-touch-icon' : 'gm-apple-touch-icon'}.png`, 180])
  if (v.prefix === 'icon') sizes.push(['favicon.png', 32])
  for (const [name, size] of sizes) {
    execFileSync('sips', ['-z', String(size), String(size), big, '--out', join(OUT, name)], { stdio: 'ignore' })
  }
  console.log(`rendered ${v.prefix}`)
}
console.log('icons written to public/')
