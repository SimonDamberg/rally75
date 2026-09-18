// Guest app (/): onboarding for a new device, then the shell. The cookie banner floats over both.
// Also the landing spot for a scanned kupong at /k/<code>.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { usePlayer } from '../lib/hooks'
import { loadCookiesAccepted, saveCookiesAccepted, savePendingCode } from '../lib/identity'
import { normalizeCode } from '../shared/game/coupon'
import { Toaster } from '../ui'
import { ClientShell } from './ClientShell'
import { CookieBanner } from './CookieBanner'
import { Onboarding } from './Onboarding'

export default function ClientApp() {
  const player = usePlayer()
  const { identity, data, forget, createPlayer } = player
  const { code } = useParams()
  const navigate = useNavigate()
  // Set before the account exists so the shell opens with the bonus reveal on top.
  const [justJoined, setJustJoined] = useState(false)
  // Pop-up offers and fake toasts wait until the cookie banner is out of the way.
  const [cookiesAccepted, setCookiesAccepted] = useState(loadCookiesAccepted)

  // A scanned kupong: park the code and get the URL out of the way at once. The shell picks it up
  // from storage, which is what lets the scan survive onboarding on a phone with no account. It also
  // means a reload cannot fire the claim a second time.
  useEffect(() => {
    if (!code) return
    // A code that does not look valid is parked anyway, raw: the server owns the verdict, and a
    // damaged sticker deserves the Swedish "vi hittar ingen kupong" rather than silence.
    savePendingCode(normalizeCode(code) || code.trim().toUpperCase().slice(0, 32))
    void navigate('/', { replace: true })
  }, [code, navigate])

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
