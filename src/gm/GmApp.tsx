// Game master app (/gm): Simon's iPad. Password gate, then the shell.
import { Toaster } from '../ui'
import { useGmAuth } from './gmAuth'
import { GmAuthProvider } from './GmAuthProvider'
import { GmShell } from './GmShell'
import { Login } from './Login'
import { useWakeLock } from './useWakeLock'

function Gate() {
  const { password } = useGmAuth()
  return password ? <GmShell /> : <Login />
}

export default function GmApp() {
  useWakeLock()
  return (
    <GmAuthProvider>
      <Gate />
      <Toaster />
    </GmAuthProvider>
  )
}
