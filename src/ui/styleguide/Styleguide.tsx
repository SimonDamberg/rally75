// Dev-only: the gallery in a phone frame and a scaled iPad frame, side by side.
import { useSyncExternalStore } from 'react'

const PHONE = { w: 390, h: 844 }
const IPAD = { w: 1180, h: 820 }
const GAP = 32

function subscribeResize(cb: () => void) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

function Frame({ title, device, w, h, scale }: { title: string; device: string; w: number; h: number; scale: number }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="font-display text-xl font-black text-ink-dim uppercase">
        {title} {w}x{h} {scale < 1 && `(${Math.round(scale * 100)} %)`}
      </figcaption>
      <div style={{ width: w * scale, height: h * scale }} className="overflow-hidden rounded-2xl ring-2 ring-tote-hi">
        <iframe
          title={title}
          src={`/styleguide/frame?device=${device}`}
          width={w}
          height={h}
          style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
          className="block border-0"
        />
      </div>
    </figure>
  )
}

export default function Styleguide() {
  const width = useSyncExternalStore(subscribeResize, () => window.innerWidth)
  const ipadScale = Math.min(1, Math.max(0.3, (width - PHONE.w - GAP * 3) / IPAD.w))
  return (
    <main className="flex min-h-dvh flex-wrap items-start gap-8 p-8">
      <Frame title="Mobil" device="phone" {...PHONE} scale={1} />
      <Frame title="iPad" device="ipad" {...IPAD} scale={ipadScale} />
    </main>
  )
}
