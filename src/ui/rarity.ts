// The CS rarity colours for the Mystery Box. Not a brand token: a tier means the same colour on the
// guest phone and on the control phone, the way cash and drift do.
import type { BoxRarity } from '../shared/game/box'

export const RARITY_COLOR: Readonly<Record<BoxRarity, string>> = {
  bla: '#4b69ff',
  lila: '#8847ff',
  rosa: '#d32ce6',
  rod: '#eb4b4b',
  guld: '#e4ae39',
}
