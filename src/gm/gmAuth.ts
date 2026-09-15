// GM password context. The password is remembered on the iPad and sent with every gm_* RPC;
// the server checks it each time, so a wrong or changed password logs out on the first call.
import { createContext, useCallback, useContext, useState } from 'react'
import type { Api } from '../lib/api'
import { toRallyError } from '../lib/errors'
import { getApi } from '../lib/supabase'
import { toast } from '../ui'

type GmApi = Api['gm']

export interface GmAuth {
  password: string | null
  /** Resolves when the server accepts the password; throws RallyError otherwise. */
  login: (password: string) => Promise<void>
  logout: () => void
}

export const GmAuthContext = createContext<GmAuth | null>(null)

export function useGmAuth(): GmAuth {
  const auth = useContext(GmAuthContext)
  if (!auth) throw new Error('useGmAuth utanför GmAuthProvider')
  return auth
}

export interface GmAction {
  /**
   * Runs a gm RPC with the password. Errors are shown as a toast (and gm_unauthorized logs out);
   * resolves to undefined on failure, so calls that return nothing should return true.
   */
  run: <T>(call: (gm: GmApi, password: string) => Promise<T>) => Promise<T | undefined>
  busy: boolean
}

export function useGmAction(): GmAction {
  const { password, logout } = useGmAuth()
  const [pending, setPending] = useState(0)

  const run = useCallback(
    async <T>(call: (gm: GmApi, password: string) => Promise<T>): Promise<T | undefined> => {
      if (!password) return undefined
      setPending((n) => n + 1)
      try {
        return await call(getApi().gm, password)
      } catch (err) {
        const error = toRallyError(err)
        toast({ text: error.message, tone: 'error' })
        if (error.code === 'gm_unauthorized' || error.code === 'gm_no_password') logout()
        return undefined
      } finally {
        setPending((n) => n - 1)
      }
    },
    [password, logout],
  )

  return { run, busy: pending > 0 }
}
