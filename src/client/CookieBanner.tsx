// Cookie consent parody: every button accepts everything.
import { useState } from 'react'
import { COOKIES } from '../shared/content/client'
import { Button, Modal, toast } from '../ui'

export function CookieBanner({ accepted, onAccept }: { accepted: boolean; onAccept: () => void }) {
  const [settings, setSettings] = useState(false)

  const accept = () => {
    onAccept()
    setSettings(false)
  }

  if (accepted) return null
  return (
    <>
      <div
        role="region"
        aria-label={COOKIES.title}
        className="fixed inset-x-0 bottom-0 z-30 animate-toast-in border-t-2 border-plate bg-night-deep/97 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-1rem_2rem_rgb(0_0_0/0.5)]"
      >
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <p className="font-display text-2xl leading-none font-black text-plate uppercase">{COOKIES.title}</p>
          <p className="text-sm text-ink-dim">{COOKIES.text}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button className="col-span-2" block onClick={accept}>
              {COOKIES.acceptAll}
            </Button>
            <Button variant="ghost" block className="text-base" onClick={accept}>
              {COOKIES.necessary}
            </Button>
            <Button variant="ghost" block className="text-base" onClick={() => setSettings(true)}>
              {COOKIES.settings}
            </Button>
          </div>
        </div>
      </div>
      <Modal
        open={settings}
        onClose={() => setSettings(false)}
        title={COOKIES.settingsTitle}
        actions={
          <Button
            block
            onClick={() => {
              accept()
              toast({ text: COOKIES.saved })
            }}
          >
            {COOKIES.save}
          </Button>
        }
      >
        <p className="text-ink-dim">{COOKIES.settingsText}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {COOKIES.categories.map((c) => (
            <li key={c} className="flex items-center justify-between gap-3 rounded-lg bg-tote/40 px-3 py-2.5">
              <span className="font-semibold">{c}</span>
              <span className="flex items-center gap-2 text-xs font-bold tracking-[0.1em] text-ink-dim uppercase">
                {COOKIES.locked}
                <span aria-hidden className="flex h-6 w-11 items-center justify-end rounded-full bg-cash p-0.5">
                  <span className="size-5 rounded-full bg-white" />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
