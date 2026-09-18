// Snabblån: offered automatically when the guest is broke (and again after a cooldown), or on
// demand from the header button.
import { useEffect, useState } from 'react'
import { LOAN } from '../shared/content/client'
import { STODLINJE } from '../shared/content/parody'
import { LOAN_AMOUNT, LOAN_DEBT } from '../shared/game/economy'
import { fmtRm } from '../shared/game/format'
import { Button, Modal, StodlinjeNote, toast } from '../ui'
import { useGuestAction } from './guest'

const COOLDOWN_MS = 90_000

export interface LoanOfferProps {
  broke: boolean
  /** Another pop-up needs the screen (bet confirm, a reveal). */
  blocked: boolean
  /** The guest tapped the header button. */
  requested: boolean
  onRequestHandled: () => void
}

export function LoanOffer({ broke, blocked, requested, onRequestHandled }: LoanOfferProps) {
  const { run, busy } = useGuestAction()
  const [snoozed, setSnoozed] = useState(false)

  useEffect(() => {
    if (!snoozed) return
    const t = setTimeout(() => setSnoozed(false), COOLDOWN_MS)
    return () => clearTimeout(t)
  }, [snoozed])

  const open = broke && !blocked && (requested || !snoozed)

  const dismiss = () => {
    setSnoozed(true)
    onRequestHandled()
  }

  const accept = async () => {
    const player = await run((api, identity) => api.takeLoan(identity))
    dismiss()
    if (player) toast({ text: LOAN.taken(fmtRm(LOAN_AMOUNT)), tone: 'win' })
  }

  const rows: [string, string, string?][] = [
    [LOAN.amount, fmtRm(LOAN_AMOUNT), 'text-cash'],
    [LOAN.repay, fmtRm(LOAN_DEBT), 'text-drift'],
    [LOAN.interest, LOAN.interestValue],
    [LOAN.term, LOAN.termValue],
  ]

  return (
    <Modal
      open={open}
      onClose={dismiss}
      tone="sleaze"
      title={LOAN.title}
      actions={
        <>
          <Button variant="ghost" onClick={dismiss}>
            {LOAN.decline}
          </Button>
          <Button variant="sleaze" loading={busy} onClick={() => void accept()}>
            {LOAN.accept}
          </Button>
        </>
      }
    >
      <p className="text-lg font-semibold">{LOAN.text}</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-night-deep p-4">
        {rows.map(([k, v, tone]) => (
          <div key={k} className="contents">
            <dt className="text-ink-dim">{k}</dt>
            <dd className={`text-right font-display text-2xl leading-none font-black tabular-nums ${tone ?? 'text-ink'}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-dim">{LOAN.debtSmallPrint}</p>
      <StodlinjeNote lead={STODLINJE.lead.loan} className="mt-3" />
    </Modal>
  )
}
