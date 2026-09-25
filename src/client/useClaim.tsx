// The Hämta flow: "Står du i baren?" first, then the claim screen. Marker go to Mr Green
// (claim_markers, every unclaimed handful at once), a beer or a cider to the bar and a Mystery Box
// prize to Simon (claim_purchase, one receipt at a time).
import { useState } from 'react'
import type { PurchaseRow } from '../lib/types'
import { MARKER, PICKUP } from '../shared/content/client'
import { playerLabel } from '../shared/game/format'
import { Button, Modal } from '../ui'
import { receiptImage, receiptName } from './buy'
import { useGuest, useGuestAction } from './guest'
import { ClaimScreen, type Shown } from './Pickup'

type PickupKind = Shown['kind']

/** What Hämta was pressed for: every unclaimed marker at once, or one receipt. */
export type ClaimTarget = { kind: 'marker'; count: number } | { kind: 'receipt'; purchase: PurchaseRow }

function pickupKind(target: ClaimTarget): PickupKind {
  return target.kind === 'marker' ? 'marker' : target.purchase.kind === 'box' ? 'box' : 'physical'
}

/**
 * The confirm ("Står du i baren?") and the claim screen after it. `ask` opens the confirm; `open`
 * is true while either is up, so the tab can keep offers and the Snabblån away.
 */
export function useClaim(onClaimed: () => void) {
  const { player, shopItems, boxPrizes } = useGuest()
  const { run, busy } = useGuestAction()
  const [asking, setAsking] = useState<ClaimTarget | null>(null)
  const [shown, setShown] = useState<Shown | null>(null)

  const confirm = async () => {
    if (!asking) return
    const target = asking
    if (target.kind === 'marker') {
      const claim = await run((api, id) => api.claimMarkers(id))
      if (!claim) return
      setShown({ kind: 'marker', headline: String(claim.count), unit: MARKER.rainUnit })
    } else {
      const purchase = await run((api, id) => api.claimPurchase(id, target.purchase.id))
      if (!purchase) return
      setShown({
        kind: pickupKind(target),
        headline: purchase.prize_name ?? purchase.item_name,
        image: receiptImage(purchase, shopItems, boxPrizes),
        rarity: purchase.prize_rarity,
      })
    }
    setAsking(null)
    // Realtime brings the stamp too; this just stops Hämta lingering if it is slow.
    onClaimed()
  }

  const kind = asking && pickupKind(asking)
  const ui = (
    <>
      <Modal
        open={!!asking}
        onClose={() => setAsking(null)}
        dismissible={!busy}
        tone="sleaze"
        title={kind ? PICKUP.ask[kind] : ''}
        actions={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setAsking(null)}>
              {PICKUP.cancel}
            </Button>
            <Button variant="sleaze" loading={busy} onClick={() => void confirm()}>
              {PICKUP.ok}
            </Button>
          </>
        }
      >
        {asking && (
          <div className="flex flex-col gap-2">
            <p className="font-display text-4xl leading-none font-black text-plate uppercase tabular-nums">
              {asking.kind === 'marker' ? MARKER.waiting(asking.count) : receiptName(asking.purchase)}
            </p>
            <p className="text-lg">{PICKUP.askText}</p>
          </div>
        )}
      </Modal>
      {shown && player && (
        <ClaimScreen shown={shown} who={playerLabel(player.name, player.tag)} onClose={() => setShown(null)} />
      )}
    </>
  )

  return { ask: setAsking, open: !!asking || !!shown, ui }
}


