// Mystery Box pieces shared by the guest shop and the control phone: the CS rarity colours, a chip
// that names the tier, and a product photo that falls back to a coloured tile when the file is
// missing. Rarity is not a brand token: it means the same colour on every surface, like cash.
import { useState } from 'react'
import type { BoxRarity } from '../shared/game/box'
import { RARITY_LABELS } from '../shared/content/ui'
import { cx } from './cx'
import { RARITY_COLOR } from './rarity'

export function RarityChip({ rarity, className }: { rarity: BoxRarity; className?: string }) {
  return (
    <span
      className={cx('w-fit rounded-full px-2 py-0.5 text-[0.65rem] font-black tracking-wide text-white uppercase', className)}
      style={{ backgroundColor: RARITY_COLOR[rarity] }}
    >
      {RARITY_LABELS[rarity]}
    </span>
  )
}

/**
 * A photo from public/butik/. An empty name or a file that is not there yet draws a tile in the
 * rarity colour (or the brand's tote) with a gift, so a prize without a photo still looks intended.
 */
export function ShopImage({
  image,
  name,
  rarity,
  className,
}: {
  image: string
  name: string
  rarity?: BoxRarity
  className?: string
}) {
  const [broken, setBroken] = useState<string | null>(null)
  const src = image ? `/butik/${image}` : ''
  if (!src || broken === src) {
    return (
      <div
        role="img"
        aria-label={name}
        className={cx('grid place-items-center overflow-hidden bg-tote text-[2.2em]', className)}
        style={rarity ? { background: `radial-gradient(circle at 50% 40%, ${RARITY_COLOR[rarity]}cc, #0008 90%)` } : undefined}
      >
        <span aria-hidden>🎁</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={name}
      draggable={false}
      onError={() => setBroken(src)}
      className={cx('object-cover', className)}
    />
  )
}
