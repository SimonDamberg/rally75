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
// index.html ships the Mr Green green, since the guest app owns the default. GM stays tote blue.
const GM_THEME_COLOR = '#07123a'

function setAttr(selector: string, attr: string, value: string): () => void {
  const el = document.querySelector(selector)
  if (!el) return () => {}
  const previous = el.getAttribute(attr)
  el.setAttribute(attr, value)
  return () => {
    if (previous === null) el.removeAttribute(attr)
    else el.setAttribute(attr, previous)
  }
}

export function useGmManifest(mode: GmMode): void {
  useEffect(() => {
    const { manifest, title } = MANIFEST[mode]
    const restore = [
      setAttr('link[rel="manifest"]', 'href', manifest),
      setAttr('link[rel="apple-touch-icon"]', 'href', GM_TOUCH_ICON),
      setAttr('meta[name="apple-mobile-web-app-title"]', 'content', title),
      setAttr('meta[name="theme-color"]', 'content', GM_THEME_COLOR),
    ]
    return () => {
      for (const undo of restore) undo()
    }
  }, [mode])
}
