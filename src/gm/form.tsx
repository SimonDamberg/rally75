// Form controls for the GM panel: big enough to hit on an iPad held in one hand.
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cx } from '../ui'

const CONTROL =
  'w-full rounded-xl bg-night-deep/80 px-4 py-3 text-2xl text-ink ring-2 ring-tote-hi/60 ring-inset placeholder:text-ink-dim/60 focus:ring-plate focus:outline-none'

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-lg font-bold tracking-[0.12em] text-ink-dim uppercase">{label}</span>
      {children}
      {hint && <span className="text-lg text-ink-dim">{hint}</span>}
    </label>
  )
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, 'min-h-14', className)} {...rest} />
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CONTROL, 'text-xl leading-snug', className)} {...rest} />
}
