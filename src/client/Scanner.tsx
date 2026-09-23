// The in-app QR scanner, opened from Bank. It reads vinstkort and, for a guest already in the app, printed kuponger too.
//
// The decoder is qr-scanner, loaded on first open so it stays out of the main chunk. It uses the
// native BarcodeDetector where there is one and its own worker elsewhere (iOS Safari has none).
// The decoded text is never shown: it goes straight to parseScan and on to the shell.
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { SKANNA } from '../shared/content/client'
import { parseScan, type ScanResult } from '../shared/game/scan'
import { Button, Modal, toast } from '../ui'

type CameraState = 'starting' | 'live' | 'denied' | 'nocam' | 'failed'

/** A wrong QR held in front of the lens decodes several times a second; say so once in a while. */
const NOT_OURS_EVERY_MS = 3000

function cameraError(err: unknown): CameraState {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'nocam'
  // qr-scanner rejects with a bare string when there is no camera, or no mediaDevices at all.
  if (typeof err === 'string' && /camera not found/i.test(err)) return 'nocam'
  return 'failed'
}

export function Scanner({ onScan, onClose }: { onScan: (result: ScanResult) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [attempt, setAttempt] = useState(0)
  const handled = useRef(false)
  const lastWrong = useRef(0)

  const decoded = useEffectEvent((text: string) => {
    if (handled.current) return
    const result = parseScan(text)
    if (!result) {
      const now = Date.now()
      if (now - lastWrong.current > NOT_OURS_EVERY_MS) {
        lastWrong.current = now
        toast({ text: SKANNA.notOurs, tone: 'error' })
      }
      return
    }
    handled.current = true
    onScan(result)
  })

  useEffect(() => {
    const el = video.current
    if (!el) return
    let cancelled = false
    let scanner: { destroy: () => void; stop: () => void } | null = null

    void import('qr-scanner')
      .then(async ({ default: QrScanner }) => {
        if (cancelled) return
        const s = new QrScanner(el, (res) => decoded(res.data), {
          preferredCamera: 'environment',
          returnDetailedScanResult: true,
          maxScansPerSecond: 8,
        })
        scanner = s
        await s.start()
        if (!cancelled) setState('live')
      })
      .catch((err: unknown) => {
        if (!cancelled) setState(cameraError(err))
      })

    return () => {
      cancelled = true
      scanner?.stop()
      scanner?.destroy()
    }
  }, [attempt])

  const retry = () => {
    setState('starting')
    setAttempt((n) => n + 1)
  }

  const message =
    state === 'starting'
      ? SKANNA.starting
      : state === 'denied'
        ? SKANNA.denied
        : state === 'nocam'
          ? SKANNA.noCamera
          : state === 'failed'
            ? SKANNA.failed
            : null

  return (
    <Modal
      open
      onClose={onClose}
      tone="sleaze"
      title={SKANNA.title}
      actions={
        <>
          {(state === 'denied' || state === 'failed') && (
            <Button variant="ghost" onClick={retry}>
              {SKANNA.retry}
            </Button>
          )}
          <Button block={state === 'live' || state === 'starting' || state === 'nocam'} onClick={onClose}>
            {SKANNA.close}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-void">
          <video ref={video} muted playsInline className="size-full object-cover" />
          {/* Viewfinder corners: the only hint of where to hold the card. */}
          <div aria-hidden className="pointer-events-none absolute inset-[14%]">
            {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4', 'bottom-0 left-0 border-b-4 border-l-4', 'right-0 bottom-0 border-r-4 border-b-4'].map((c) => (
              <span key={c} className={`absolute size-10 rounded-sm border-sleaze ${c}`} />
            ))}
          </div>
          {message && (
            <p className="absolute inset-0 flex items-center justify-center bg-void/80 p-6 text-center text-lg">
              {message}
            </p>
          )}
        </div>
        <p className="text-center text-ink-dim">{SKANNA.hint}</p>
      </div>
    </Modal>
  )
}
