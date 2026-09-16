// Stewards' inquiry as the room sees it: the accusation, then an endless "they are deliberating".
// The three rulings live on the control phone (src/gm/control/InquiryRulings.tsx); this side never
// decides anything, so it just holds the tension until the result arrives over Realtime.
import { INQUIRY_TITLE } from '../../shared/content/commentary'
import { GM_RACE } from '../../shared/content/gm'

export function InquiryDrama({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 z-30 flex animate-pop-in flex-col items-center justify-center gap-10 bg-night-deep/95 px-16 text-center">
      <p className="font-display text-tv-lg font-black tracking-wide text-drift uppercase">{INQUIRY_TITLE}</p>
      <p className="max-w-5xl text-tv-md leading-tight font-bold text-ink">{text}</p>
      <p className="flex items-center gap-5 text-tv-sm text-ink-dim">
        <span className="size-12 shrink-0 animate-spin rounded-full border-6 border-drift border-t-transparent" />
        {GM_RACE.inquiryWait}
      </p>
    </div>
  )
}
