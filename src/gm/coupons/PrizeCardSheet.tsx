// The printable vinstkort: one big card on an A4, to cut out and ideally laminate, since it lives in
// a game runner's pocket all night. Black on white like the kupong sheet, with the frog as the one
// colour mark. The QR holds MRG1:<code> (see scan.ts), never a URL, and the code is not printed in
// text: there is no typed fallback for a card, so a photo of the text would be the only way to cheat.
import { GM_PRIZE_CARDS } from '../../shared/content/gm'
import { PRIZE_CARD_PRINT } from '../../shared/content/coupons'
import { fmtRm } from '../../shared/game/format'
import { cardPayload } from '../../shared/game/scan'
import { Button, QrCode } from '../../ui'

export interface PrizeSheet {
  code: string
  tier: number
  amount: number
  label: string
}

export function PrizeCardSheet({ sheet, onClose }: { sheet: PrizeSheet; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white text-black print:static print:overflow-visible">
      <div className="flex flex-wrap items-center gap-3 border-b border-black/20 p-4 print:hidden">
        <h2 className="font-display text-2xl font-black uppercase">{GM_PRIZE_CARDS.sheetTitle}</h2>
        <p className="min-w-0 flex-1 text-sm">{GM_PRIZE_CARDS.sheetHint}</p>
        <Button onClick={() => window.print()}>{GM_PRIZE_CARDS.print}</Button>
        <Button variant="ghost" onClick={onClose}>
          {GM_PRIZE_CARDS.sheetClose}
        </Button>
      </div>

      <div className="flex justify-center p-6 print:p-0">
        <div className="flex w-[120mm] flex-col items-center gap-[4mm] rounded-[4mm] border-[1.2mm] border-black p-[8mm] text-center">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-[10pt] font-bold tracking-[0.14em] uppercase">{PRIZE_CARD_PRINT.brand}</span>
            <img src="/kupong-logo.png" alt="" className="h-[16mm] w-auto rounded-[1.5mm] object-contain" />
          </div>
          <p className="font-display text-[40pt] leading-none font-black tabular-nums">{fmtRm(sheet.amount)}</p>
          <QrCode
            value={cardPayload(sheet.code)}
            label={fmtRm(sheet.amount)}
            className="size-[70mm] bg-white! text-black!"
          />
          {sheet.label && (
            <p className="font-display text-[18pt] leading-none font-black uppercase">{sheet.label}</p>
          )}
          <p className="text-[11pt] leading-tight font-bold">{PRIZE_CARD_PRINT.scan}</p>
          <p className="text-[7pt] leading-tight">{PRIZE_CARD_PRINT.legal}</p>
        </div>
      </div>
    </div>
  )
}
