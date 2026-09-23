// The printable sheet: A4 pages of twelve kuponger with cut lines.
//
// Deliberately black on white, with the valör carried by the word and the border rather than by
// colour, so a tired office printer still produces something scannable. Print each valör on its own
// colour of paper if the stacks need telling apart across a dark room.
//
// It is a plain overlay rather than a Modal: a <dialog> in the browser's top layer prints badly, and
// the print stylesheet in index.css hides the page chrome instead.
import { GM_COUPONS } from '../../shared/content/gm'
import { COUPON_TIER_COPY, TICKET } from '../../shared/content/coupons'
import { fmtRm } from '../../shared/game/format'
import { Button, cx, QrCode } from '../../ui'

/** Tickets per A4 page: 3 across, 4 down. */
const PER_PAGE = 12

export interface SheetCoupon {
  id: string
  code: string
}

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}

function Ticket({
  code,
  tier,
  amount,
  label,
  base,
}: {
  code: string
  tier: number
  amount: number
  label: string
  base: string
}) {
  const copy = COUPON_TIER_COPY[tier as 1 | 2 | 3]
  return (
    <div className="flex h-[66mm] flex-col items-center gap-[1.5mm] border border-dashed border-black p-[3mm] text-center">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-[7pt] font-bold tracking-[0.12em] uppercase">{TICKET.brand}</span>
        {/* Corner mark, in colour. It replaces a short valör word that the line below repeats. */}
        <img src="/kupong-logo.png" alt="" className="h-[11mm] w-auto rounded-[1mm] object-contain" />
      </div>
      <p className="font-display text-[15pt] leading-none font-black uppercase">{copy?.name}</p>
      <p className="font-display text-[20pt] leading-none font-black tabular-nums">{fmtRm(amount)}</p>
      <QrCode
        value={`${base}/k/${code}`}
        label={copy?.name ?? TICKET.scan}
        className="size-[26mm] bg-white! text-black!"
      />
      <p className="text-[7pt] leading-tight">{label || TICKET.scan}</p>
      <p className="mt-auto text-[6pt] leading-tight">{TICKET.once}</p>
    </div>
  )
}

export function TicketSheet({
  coupons,
  tier,
  amount,
  label,
  base,
  onClose,
}: {
  coupons: readonly SheetCoupon[]
  tier: number
  amount: number
  label: string
  base: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white text-black print:static print:overflow-visible">
      <div className="flex flex-wrap items-center gap-3 border-b border-black/20 p-4 print:hidden">
        <h2 className="font-display text-2xl font-black uppercase">{GM_COUPONS.sheetTitle}</h2>
        <p className="min-w-0 flex-1 text-sm">{GM_COUPONS.sheetHint}</p>
        <Button onClick={() => window.print()}>{GM_COUPONS.print}</Button>
        <Button variant="ghost" onClick={onClose}>
          {GM_COUPONS.sheetClose}
        </Button>
      </div>

      {chunk(coupons, PER_PAGE).map((page, i, all) => (
        <div
          key={i}
          className={cx(
            'grid grid-cols-3 p-2 print:p-0',
            // Not after the last one: a trailing break prints a blank sheet.
            i < all.length - 1 && 'break-after-page',
          )}
        >
          {page.map((c) => (
            <Ticket key={c.id} code={c.code} tier={tier} amount={amount} label={label} base={base} />
          ))}
        </div>
      ))}
      <p className="p-4 text-[7pt] print:hidden">{TICKET.legal}</p>
    </div>
  )
}
