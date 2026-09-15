import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { loadGmPassword, saveGmPassword } from '../lib/identity'
import { getApi } from '../lib/supabase'
import { GmAuthContext } from './gmAuth'

export function GmAuthProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState(loadGmPassword)

  const login = useCallback(async (next: string) => {
    await getApi().gm.login(next)
    saveGmPassword(next)
    setPassword(next)
  }, [])

  const logout = useCallback(() => {
    saveGmPassword(null)
    setPassword(null)
  }, [])

  const value = useMemo(() => ({ password, login, logout }), [password, login, logout])
  return <GmAuthContext value={value}>{children}</GmAuthContext>
}
