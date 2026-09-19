// First visit: a fake secure-connection sequence, then the absurd KYC form that only needs a name.
import { useEffect, useState, type FormEvent } from 'react'
import { toRallyError } from '../lib/errors'
import { ONBOARDING } from '../shared/content/client'
import { ERROR_MESSAGES } from '../shared/content/errors'
import { CONNECT_LINES, KYC_CONFIRM, KYC_PLACEHOLDER, KYC_TEXT, KYC_TITLE, LEGAL_TEXT, STODLINJE } from '../shared/content/parody'
import { MAX_NAME_LENGTH } from '../shared/game/economy'
import { BonusBar, Button, cx, MrGreenLogo, StodlinjeNote } from '../ui'

const LINE_MS = 850

export function Onboarding({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [step, setStep] = useState(0)
  const connecting = step < CONNECT_LINES.length

  useEffect(() => {
    if (!connecting) return
    const t = setTimeout(() => setStep((s) => s + 1), LINE_MS)
    return () => clearTimeout(t)
  }, [connecting, step])

  return (
    <div className="flex min-h-dvh flex-col">
      <BonusBar />
      {connecting ? (
        <Connect step={step} onSkip={() => setStep(CONNECT_LINES.length)} />
      ) : (
        <Kyc onCreate={onCreate} />
      )}
    </div>
  )
}

function Connect({ step, onSkip }: { step: number; onSkip: () => void }) {
  const progress = (step + 1) / CONNECT_LINES.length
  return (
    <button
      type="button"
      onClick={onSkip}
      className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-24 text-center"
    >
      <MrGreenLogo variant="full" size="lg" />
      <div className="flex w-full max-w-xs flex-col items-center gap-4">
        <span className="text-sm font-bold tracking-[0.16em] text-ink-dim uppercase">{ONBOARDING.connectTitle}</span>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-night-deep ring-1 ring-white/10">
          <div
            className="h-full rounded-full bg-plate transition-[width] duration-700 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p key={step} aria-live="polite" className="min-h-14 animate-pop-in text-lg font-semibold text-ink">
          {CONNECT_LINES[step]}
        </p>
      </div>
      <span className="text-xs text-ink-dim/70">{ONBOARDING.skip}</span>
    </button>
  )
}

const INPUT =
  'w-full min-h-12 rounded-xl bg-night-deep/80 px-4 py-3 text-lg text-ink ring-2 ring-tote-hi/60 ring-inset placeholder:text-ink-dim/60 focus:ring-plate focus:outline-none'
const LABEL = 'text-xs font-bold tracking-[0.14em] text-ink-dim uppercase'

function Kyc({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  const [name, setName] = useState('')
  const [loss, setLoss] = useState<number | null>(null)
  const [origin, setOrigin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(ERROR_MESSAGES.name_empty)
    setBusy(true)
    setError(null)
    try {
      await onCreate(name)
    } catch (err) {
      setError(toRallyError(err).message)
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 pt-6 pb-10">
      <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-5">
        <MrGreenLogo variant="lockup" size="md" />
        <div>
          <h1 className="font-display text-4xl leading-none font-black text-plate uppercase">{KYC_TITLE}</h1>
          <p className="mt-2 text-base text-ink-dim">{KYC_TEXT}</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{ONBOARDING.nameLabel}</span>
          <input
            className={INPUT}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder={KYC_PLACEHOLDER}
            autoComplete="nickname"
            enterKeyHint="go"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="flex items-start gap-3 rounded-xl bg-tote/40 p-3 ring-1 ring-white/10 ring-inset">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md bg-cash font-black text-night">
            ✓
          </span>
          <span className="flex flex-col">
            <span className="font-semibold">{ONBOARDING.ageLabel}</span>
            <span className="text-xs text-ink-dim">{ONBOARDING.ageLocked}</span>
          </span>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className={cx(LABEL, 'mb-1.5')}>{ONBOARDING.lossLabel}</legend>
          <div className="grid grid-cols-3 gap-2">
            {ONBOARDING.lossOptions.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={loss === i}
                onClick={() => setLoss(i)}
                className={cx(
                  'min-h-11 rounded-xl px-2 text-sm font-bold ring-2 ring-inset',
                  loss === i ? 'bg-sleaze text-sleaze-ink ring-sleaze' : 'bg-tote/40 text-ink ring-tote-hi/50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>{ONBOARDING.originLabel}</span>
          <input
            className={INPUT}
            value={origin}
            placeholder={ONBOARDING.originPlaceholder}
            onChange={(e) => setOrigin(e.target.value)}
          />
        </label>

        {error && (
          <p role="alert" className="font-bold text-drift">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block loading={busy}>
          {busy ? ONBOARDING.creating : KYC_CONFIRM}
        </Button>
        <p className="text-[0.7rem] leading-snug text-ink-dim/70">{LEGAL_TEXT}</p>
        <StodlinjeNote lead={STODLINJE.lead.kyc} className="text-xs" />
      </form>
    </main>
  )
}
