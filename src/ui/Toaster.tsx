import { useSyncExternalStore } from 'react'
import { cx } from './cx'
import { toastStore, type ToastTone } from './toast'

const TONE: Record<ToastTone, string> = {
  info: 'border-tote-hi text-ink',
  win: 'border-cash text-cash',
  error: 'border-drift text-ink',
}

const EMPTY: readonly never[] = []

/** Renders toasts pushed with toast(). Mount once per app. Tap a toast to dismiss it. */
export function Toaster({ className }: { className?: string }) {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => EMPTY)
  return (
    <div
      aria-live="polite"
      className={cx(
        'pointer-events-none fixed inset-x-3 bottom-3 z-40 flex flex-col items-start gap-2 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:right-5 md:bottom-5 md:w-96 md:items-end',
        className,
      )}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => toastStore.dismiss(t.id)}
          className={cx(
            'pointer-events-auto max-w-full animate-toast-in rounded-lg border-l-4 bg-night-deep/95 px-4 py-2.5 text-left text-sm font-semibold shadow-[0_0.5rem_1.5rem_rgb(0_0_0/0.5)] ring-1 ring-white/10',
            TONE[t.tone],
          )}
        >
          {t.text}
        </button>
      ))}
    </div>
  )
}
