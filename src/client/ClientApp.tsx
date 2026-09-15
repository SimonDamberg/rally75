// Guest app (/): onboarding for a new device, then the shell. The cookie banner floats over both.
import { useEffect, useState } from 'react'
import { usePlayer } from '../lib/hooks'
import { loadCookiesAccepted, saveCookiesAccepted } from '../lib/identity'
import { Toaster } from '../ui'
import { ClientShell } from './ClientShell'
import { CookieBanner } from './CookieBanner'
import { Onboarding } from './Onboarding'

export default function ClientApp() {
  const player = usePlayer()
  const { identity, data, forget, createPlayer } = player
  // Set before the account exists so the shell opens with the bonus reveal on top.
  const [justJoined, setJustJoined] = useState(false)
  // Pop-up offers and fake toasts wait until the cookie banner is out of the way.
  const [cookiesAccepted, setCookiesAccepted] = useState(loadCookiesAccepted)

  // A Realtime DELETE (the GM removed this player) leaves the identity behind; drop it.
  useEffect(() => {
    if (identity && data === null) forget()
  }, [identity, data, forget])

  return (
    <>
      {identity ? (
        <ClientShell
          identity={identity}
          player={data ?? undefined}
          forget={forget}
          justJoined={justJoined}
          cookiesAccepted={cookiesAccepted}
          onBonusSeen={() => setJustJoined(false)}
        />
      ) : (
        <Onboarding
          onCreate={async (name) => {
            setJustJoined(true)
            try {
              await createPlayer(name)
            } catch (err) {
              setJustJoined(false)
              throw err
            }
          }}
        />
      )}
      <CookieBanner
        accepted={cookiesAccepted}
        onAccept={() => {
          saveCookiesAccepted()
          setCookiesAccepted(true)
        }}
      />
      <Toaster className="top-[calc(env(safe-area-inset-top)+0.75rem)]! bottom-auto! md:top-5!" />
    </>
  )
}
