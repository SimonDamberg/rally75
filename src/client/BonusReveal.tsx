// Right after sign-up: the welcome bonus rolls onto the account.
import type { PlayerRow } from '../lib/types'
import { ONBOARDING } from '../shared/content/client'
import { WELCOME_BONUS } from '../shared/game/economy'
import { fmtRm, playerLabel } from '../shared/game/format'
import { Button, Modal } from '../ui'
import { CountUp } from './CountUp'

export function BonusReveal({ open, player, onClose }: { open: boolean; player: PlayerRow | undefined; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      tone="sleaze"
      title={ONBOARDING.bonusTitle}
      actions={
        <Button size="lg" block onClick={onClose}>
          {ONBOARDING.bonusCta}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        {player && <p className="text-lg font-semibold">{ONBOARDING.bonusGreeting(playerLabel(player.name, player.tag))}</p>}
        <div className="bulbs w-full rounded-xl bg-night-deep px-4 py-6">
          {open && (
            <CountUp to={WELCOME_BONUS} format={fmtRm} className="font-display text-7xl leading-none font-black text-plate tabular-nums" />
          )}
        </div>
        <p className="text-ink-dim">{ONBOARDING.bonusText}</p>
      </div>
    </Modal>
  )
}
