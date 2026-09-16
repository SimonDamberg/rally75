// Stewards' inquiry on the control phone: the accusation holds, then Simon picks one of three
// rulings. The iPad shows the drama (src/gm/display/InquiryDrama.tsx); the decision is only here.
import { useEffect, useState } from 'react'
import { INQUIRY_TITLE } from '../../shared/content/commentary'
import { GM_RACE } from '../../shared/content/gm'
import type { Ruling } from '../../shared/game/types'
import { Button, Modal } from '../../ui'

const HOLD_MS = 3200

export function InquiryRulings({ text, busy, onRule }: { text: string; busy: boolean; onRule: (ruling: Ruling) => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), HOLD_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <Modal open onClose={() => {}} dismissible={false} tone="danger" title={INQUIRY_TITLE}>
      <div className="flex flex-col gap-5 py-2">
        <p className="text-lg leading-snug font-bold">{text}</p>
        {ready ? (
          <div className="flex flex-col gap-3">
            <Button block loading={busy} onClick={() => onRule('pay_new_winner')}>
              {GM_RACE.rulePayNewWinner}
            </Button>
            <Button block variant="danger" disabled={busy} onClick={() => onRule('void')}>
              {GM_RACE.ruleVoid}
            </Button>
            <Button block variant="ghost" disabled={busy} onClick={() => onRule('dismiss')}>
              {GM_RACE.ruleDismiss}
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-3 text-base text-ink-dim">
            <span className="size-7 shrink-0 animate-spin rounded-full border-3 border-drift border-t-transparent" />
            {GM_RACE.inquiryWait}
          </p>
        )}
      </div>
    </Modal>
  )
}
