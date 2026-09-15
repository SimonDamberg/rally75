// Stewards' inquiry: the accusation holds on screen, then the GM picks one of three rulings.
import { useEffect, useState } from 'react'
import { INQUIRY_TITLE } from '../shared/content/commentary'
import { GM_RACE } from '../shared/content/gm'
import type { Ruling } from '../shared/game/types'
import { Button, Modal } from '../ui'

const HOLD_MS = 3200

export function InquiryOverlay({ text, busy, onRule }: { text: string; busy: boolean; onRule: (ruling: Ruling) => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setReady(true), HOLD_MS)
    return () => clearTimeout(id)
  }, [])

  return (
    <Modal open onClose={() => {}} dismissible={false} tone="danger" title={INQUIRY_TITLE} className="w-[min(60rem,calc(100vw-2rem))]">
      <div className="flex flex-col gap-6 py-2">
        <p className="text-tv-sm leading-snug font-bold">{text}</p>
        {ready ? (
          <div className="flex flex-col gap-4">
            <Button size="lg" block loading={busy} onClick={() => onRule('pay_new_winner')}>
              {GM_RACE.rulePayNewWinner}
            </Button>
            <Button size="lg" block variant="danger" disabled={busy} onClick={() => onRule('void')}>
              {GM_RACE.ruleVoid}
            </Button>
            <Button size="lg" block variant="ghost" disabled={busy} onClick={() => onRule('dismiss')}>
              {GM_RACE.ruleDismiss}
            </Button>
          </div>
        ) : (
          <p className="flex items-center gap-4 text-2xl text-ink-dim">
            <span className="size-10 shrink-0 animate-spin rounded-full border-4 border-drift border-t-transparent" />
            {GM_RACE.inquiryWait}
          </p>
        )}
      </div>
    </Modal>
  )
}
