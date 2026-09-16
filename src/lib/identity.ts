// Guest identity ({playerId, token}), guest flags and the remembered GM password, in localStorage.
// The race start is not here: it lives in races.started_at so every device replays the same race.
// Exposed as an external store so hooks re-render when it changes (also across tabs).
import type { Identity } from './types'

const IDENTITY_KEY = 'rally75.identity'
const GM_PASSWORD_KEY = 'rally75.gmPassword'
const SEEN_RESULT_KEY = 'rally75.seenResult'
const COOKIES_KEY = 'rally75.cookiesAccepted'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the identity lives only for this page load.
  }
}

function parseIdentity(raw: string | null): Identity | null {
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as Partial<Identity>
    return typeof v.playerId === 'string' && typeof v.token === 'string'
      ? { playerId: v.playerId, token: v.token }
      : null
  } catch {
    return null
  }
}

let current: Identity | null | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const identityStore = {
  get(): Identity | null {
    if (current === undefined) current = parseIdentity(readStorage(IDENTITY_KEY))
    return current
  },
  set(identity: Identity): void {
    current = identity
    writeStorage(IDENTITY_KEY, JSON.stringify(identity))
    emit()
  },
  clear(): void {
    if (current === null) return
    current = null
    writeStorage(IDENTITY_KEY, null)
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    if (listeners.size === 1) window.addEventListener('storage', onStorage)
    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) window.removeEventListener('storage', onStorage)
    }
  },
}

function onStorage(e: StorageEvent) {
  if (e.key !== IDENTITY_KEY) return
  current = parseIdentity(e.newValue)
  emit()
}

export function loadGmPassword(): string | null {
  return readStorage(GM_PASSWORD_KEY)
}

export function saveGmPassword(password: string | null): void {
  writeStorage(GM_PASSWORD_KEY, password)
}

/** The last race whose result reveal this device has shown. */
export function loadSeenResult(): string | null {
  return readStorage(SEEN_RESULT_KEY)
}

export function saveSeenResult(raceId: string): void {
  writeStorage(SEEN_RESULT_KEY, raceId)
}

/** The guest clicked any cookie banner button (they all accept). */
export function loadCookiesAccepted(): boolean {
  return readStorage(COOKIES_KEY) === '1'
}

export function saveCookiesAccepted(): void {
  writeStorage(COOKIES_KEY, '1')
}
