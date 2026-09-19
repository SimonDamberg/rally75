// "Bank": what the night has done to you in three numbers, and the one lever that moves any of
// them. Paying off a Snabblån takes the same amount off saldo and skuld, so it changes neither
// leaderboard (see repay.test.ts). The small print says so; that is the joke.
import { useState } from 'react'
import { BANK } from '../shared/content/client'
import { STODLINJE } from '../shared/content/parody'
import { UI_LABELS } from '../shared/content/ui'
import { normalizeCode } from '../shared/game/coupon'
import { LOAN_THRESHOLD, nightNet } from '../shared/game/economy'
import { fmtRm } from '../shared/game/format'
import { Button, cx, SmallPrint, StodlinjeNote, toast } from '../ui'
import { useGuest, useGuestAction } from './guest'
import { addRepayChip, afterRepay, checkRepay, maxRepay, REPAY_CHIPS } from './repay'

export function Bank({
  onLoan,
  broke,
  onRedeemCoupon,
  couponBusy,
}: {
  onLoan: () => void
  broke: boolean
  /** Hands a hand-typed kupong code to the shell, which owns the reveal. */
  onRedeemCoupon: (code: string) => void
  couponBusy: boolean
}) {
  const { player } = useGuest()
  const { run, busy } = useGuestAction()
  const [amount, setAmount] = useState(0)
  const [code, setCode] = useState('')

  if (!player) return <p className="p-6 text-center text-ink-dim">{UI_LABELS.loading}</p>

  const { balance, debt } = player
  const net = nightNet(player)
  const ceiling = maxRepay(balance, debt)
  const check = checkRepay(amount, balance, debt)
  const preview = afterRepay(player, amount)

  const pay = async () => {
    const before = debt
    const updated = await run((api, identity) => api.repayDebt(identity, amount))
    if (!updated) return
    setAmount(0)
    toast({ text: BANK.paid(fmtRm(before - updated.debt)), tone: 'win' })
  }

  const summary: [string, string, string][] = [
    [BANK.balance, fmtRm(balance), 'text-plate'],
    [BANK.debt, debt > 0 ? fmtRm(debt) : fmtRm(0), debt > 0 ? 'text-drift' : 'text-ink-dim'],
    [BANK.net, `${net > 0 ? '+' : ''}${fmtRm(net)}`, net > 0 ? 'text-cash' : net < 0 ? 'text-drift' : 'text-ink-dim'],
  ]

  return (
    <div className="flex flex-1 flex-col gap-4 p-3">
      <h1 className="px-1 font-display text-4xl leading-none font-black text-plate uppercase">{BANK.title}</h1>

      <dl className="grid grid-cols-3 gap-2">
        {summary.map(([k, v, tone]) => (
          <div key={k} className="flex min-w-0 flex-col gap-1 rounded-xl bg-tote/50 px-3 py-2.5 ring-1 ring-white/10 ring-inset">
            <dt className="text-[0.65rem] font-bold tracking-[0.14em] text-ink-dim uppercase">{k}</dt>
            <dd className={cx('truncate font-display text-xl leading-none font-black tabular-nums', tone)}>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="px-1 text-xs text-ink-dim">{BANK.netHint}</p>

      {debt > 0 ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
          <h2 className="font-display text-2xl leading-none font-black uppercase">{BANK.repayTitle}</h2>
          <p className="text-sm text-ink-dim">{BANK.repayText}</p>
          <StodlinjeNote lead={STODLINJE.lead.debt} />

          {check === 'no_money' ? (
            <p className="text-sm font-semibold text-drift">{BANK.noMoney}</p>
          ) : (
            <>
              <span className="text-[0.65rem] font-bold tracking-[0.14em] text-ink-dim uppercase">{BANK.pick}</span>
              <div className="flex flex-wrap gap-2">
                {REPAY_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={ceiling === 0}
                    onClick={() => setAmount((a) => addRepayChip(a, chip, balance, debt))}
                    className="min-h-11 rounded-xl bg-tote px-4 font-display text-lg font-extrabold tabular-nums ring-1 ring-tote-hi/70 ring-inset active:bg-tote-hi disabled:opacity-40"
                  >
                    {fmtRm(chip)}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={ceiling === 0}
                  onClick={() => setAmount(ceiling)}
                  className="min-h-11 rounded-xl bg-sleaze px-4 font-display text-lg font-extrabold text-sleaze-ink uppercase active:brightness-110 disabled:opacity-40"
                >
                  {BANK.all}
                </button>
                {amount > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(0)}
                    className="min-h-11 rounded-xl px-4 font-display text-lg font-extrabold text-ink-dim uppercase"
                  >
                    {BANK.clear}
                  </button>
                )}
              </div>

              <Button block loading={busy} disabled={check !== 'ok'} onClick={() => void pay()}>
                {amount > 0 ? BANK.pay(fmtRm(amount)) : BANK.payNothing}
              </Button>
              {amount > 0 && (
                <p className="text-center text-xs text-ink-dim tabular-nums">
                  {BANK.after(fmtRm(preview.balance), fmtRm(preview.debt))}
                </p>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-2 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
          <h2 className="font-display text-2xl leading-none font-black text-cash uppercase">{BANK.debtFree}</h2>
          <p className="text-sm text-ink-dim">{BANK.debtFreeText}</p>
        </section>
      )}

      {/* The fallback for a ticket whose QR will not scan in party lighting. */}
      <section className="flex flex-col gap-3 rounded-2xl bg-tote/40 p-4 ring-1 ring-white/10 ring-inset">
        <h2 className="font-display text-2xl leading-none font-black uppercase">{BANK.couponTitle}</h2>
        <p className="text-sm text-ink-dim">{BANK.couponText}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const typed = code.trim()
            if (!typed) return
            setCode('')
            onRedeemCoupon(normalizeCode(typed) || typed)
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={BANK.couponPlaceholder}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label={BANK.couponTitle}
            className="min-w-0 flex-1 rounded-xl bg-night-deep/80 px-4 py-3 font-display text-xl font-extrabold tracking-widest text-ink uppercase tabular-nums ring-2 ring-tote-hi/60 ring-inset placeholder:text-ink-dim/60 focus:ring-plate focus:outline-none"
          />
          <Button type="submit" loading={couponBusy} disabled={!code.trim()}>
            {BANK.couponSubmit}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <Button variant="sleaze" block disabled={!broke} onClick={onLoan}>
          {BANK.loan}
        </Button>
        {!broke && <p className="text-center text-xs text-ink-dim">{BANK.loanLocked(fmtRm(LOAN_THRESHOLD))}</p>}
      </section>

      <p className="px-1 text-xs text-ink-dim">{BANK.smallPrint}</p>
      <SmallPrint className="mt-auto" />
    </div>
  )
}
