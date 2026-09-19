// Crops the kusk photos into the round face badges in public/kuskar/. Run once; the JPEGs are
// committed and the originals stay out of the repo.
//
//   npm run kuskar -- ~/Downloads     reads <slug>.PNG from that folder
//
// The source photos are 3000x1987. Each entry is a square crop (size, then top-left y and x) with
// the face in the middle, so it fills the circle. sips does the work: no dependency, and .mjs keeps
// it out of the typecheck, lint and Vite build (same reasoning as scripts/icons.mjs).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SRC = process.argv[2]
if (!SRC) {
  console.error('kuskar: pass the folder with the source photos, e.g. npm run kuskar -- ~/Downloads')
  process.exit(2)
}
const OUT = join(process.cwd(), 'public/kuskar')
const TMP = join(tmpdir(), 'rally75-kuskar')
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

/** slug: [size, y, x] of the square crop. Slugs match KUSK_PHOTOS in src/shared/content/kuskar.ts. */
const CROPS = {
  simon: [1900, 87, 550],
  gp: [1500, 225, 855],
  emma: [1700, 200, 650],
  jesper: [1600, 150, 775],
  erik: [1700, 150, 650],
  axel: [1700, 100, 455],
  palm: [1800, 87, 645],
  kajsa: [1500, 225, 840],
}

for (const [slug, [size, y, x]] of Object.entries(CROPS)) {
  const src = join(SRC, `${slug}.PNG`)
  if (!existsSync(src)) {
    console.error(`kuskar: missing ${src}`)
    process.exit(1)
  }
  const out = join(OUT, `${slug}.jpg`)
  // Two passes: sips ignores --cropOffset (and writes a black square) when the same call also
  // resizes or converts.
  const crop = join(TMP, `${slug}.png`)
  const sips = (...args) => execFileSync('sips', args, { stdio: 'ignore' })
  sips(src, '--cropToHeightWidth', String(size), String(size), '--cropOffset', String(y), String(x), '--out', crop)
  sips(crop, '-Z', '512', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '--out', out)
  console.log(`kuskar: ${out}`)
}
