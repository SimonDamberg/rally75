// The two brands share one set of semantic colour names, so the Mr Green scope and the Rally75
// scope must always declare exactly the same tokens. If one gains a token and the other does not,
// that token keeps the wrong brand's colour inside the race panel, which is easy to miss by eye.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

/** The body of a rule, found by a selector that starts a line (so comments mentioning it are skipped). */
function bodyOf(selector: string): string {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`^${escaped}[^{]*\\{([^}]*)\\}`, 'm').exec(css)
  expect(match, `rule ${selector} missing from src/index.css`).not.toBeNull()
  return match![1]
}

/** The `--color-*` names declared inside a rule. */
function tokensIn(selector: string): string[] {
  return [...bodyOf(selector).matchAll(/(--color-[\w-]+)\s*:/g)].map((m) => m[1]).sort()
}

describe('brand theme scopes', () => {
  const mrgreen = tokensIn(":root[data-brand='mrgreen']")
  const rally75 = tokensIn('.theme-rally75')
  const plinko = tokensIn('.theme-plinko')

  it('declares the same tokens in both brands and in the Plånko panel', () => {
    expect(mrgreen).toEqual(rally75)
    expect(plinko).toEqual(rally75)
  })

  it('remaps the surfaces, the neutrals and the sleaze accent', () => {
    expect(mrgreen).toEqual([
      '--color-ink',
      '--color-ink-dim',
      '--color-marquee',
      '--color-marquee-bulb',
      '--color-marquee-ink',
      '--color-night',
      '--color-night-deep',
      '--color-night-glow',
      '--color-sleaze',
      '--color-sleaze-ink',
      '--color-sleaze-shade',
      '--color-tote',
      '--color-tote-hi',
      '--color-void',
    ])
  })

  // Money and odds must mean the same colour on both brands, so these never get a brand override.
  it('leaves the money and alert tokens alone', () => {
    for (const token of ['--color-plate', '--color-cash', '--color-drift']) {
      expect(mrgreen).not.toContain(token)
      expect(rally75).not.toContain(token)
      expect(plinko).not.toContain(token)
    }
  })

  it('restores Rally75 from the named blue set rather than repeating hex', () => {
    expect(bodyOf('.theme-rally75')).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})
