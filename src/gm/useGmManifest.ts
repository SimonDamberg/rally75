// Points the document at the right manifest while a GM route is open.
//
// iOS follows the manifest's start_url when you add a page to the home screen, so one manifest
// cannot give three apps their own icon. index.html ships the guest one; the control phone and the
// display iPad swap it (and the apple-touch-icon) on mount, so "Lägg till på hemskärmen" installs
// whichever role that device is actually for.
import { useEffect } from 'react'

export type GmMode = 'control' | 'display'

const MANIFEST: Record<GmMode, { manifest: string; title: string }> = {
  control: { manifest: '/gm.webmanifest', title: 'Spelledare' },
  display: { manifest: '/display.webmanifest', title: 'Rally75 Skärm' },
}

const GM_TOUCH_ICON = '/gm-apple-touch-icon.png'

function setHref(selector: string, href: string): () => void {
  const el = document.querySelector<HTMLLinkElement>(selector)
  if (!el) return () => {}
  const previous = el.getAttribute('href')
  el.setAttribute('href', href)
  return () => {
    if (previous === null) el.removeAttribute('href')
    else el.setAttribute('href', previous)
  }
}

export function useGmManifest(mode: GmMode): void {
  useEffect(() => {
    const { manifest, title } = MANIFEST[mode]
    const restore = [
      setHref('link[rel="manifest"]', manifest),
      setHref('link[rel="apple-touch-icon"]', GM_TOUCH_ICON),
    ]
    const titleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')
    const previousTitle = titleMeta?.content
    if (titleMeta) titleMeta.content = title
    return () => {
      for (const undo of restore) undo()
      if (titleMeta && previousTitle !== undefined) titleMeta.content = previousTitle
    }
  }, [mode])
}
