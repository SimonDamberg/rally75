// Game master app, in two roles behind one password gate:
//   /gm          Simon's phone. Every control.
//   /gm/display  the iPad on its stand. Pure output, nothing to tap.
// Separate URLs so each device's home-screen icon opens straight into its own role.
import { Route, Routes } from 'react-router'
import { Toaster } from '../ui'
import { ControlShell } from './control/ControlShell'
import { Login } from './control/Login'
import { DisplayShell } from './display/DisplayShell'
import { useGmAuth } from './gmAuth'
import { GmAuthProvider } from './GmAuthProvider'
import { useGmManifest } from './useGmManifest'
import { useWakeLock } from './useWakeLock'

/** The display needs the password too: replaying the race requires gm_get_secrets. */
function Gate({ children }: { children: React.ReactNode }) {
  const { password } = useGmAuth()
  return password ? children : <Login />
}

function Control() {
  useGmManifest('control')
  return (
    <>
      <Gate>
        <ControlShell />
      </Gate>
      <Toaster />
    </>
  )
}

function Display() {
  useGmManifest('display')
  // Read across the room, so the toasts are sized up and lifted clear of the trot parade.
  return (
    <>
      <Gate>
        <DisplayShell />
      </Gate>
      <Toaster size="tv" />
    </>
  )
}

export default function GmApp() {
  useWakeLock()
  return (
    <GmAuthProvider>
      <Routes>
        <Route path="/" element={<Control />} />
        <Route path="display" element={<Display />} />
      </Routes>
    </GmAuthProvider>
  )
}
