import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/big-shoulders-display'
import './index.css'
import ClientApp from './client/ClientApp'
import { GM_LOADING } from './shared/content/ui'
import { LoadingScreen } from './ui'

// The GM console is only ever opened on Simon's iPad, so guests should not download it.
// ClientApp stays eager: the guest path is the one that must be fast from a cold QR scan.
const GmApp = lazy(() => import('./gm/GmApp'))

// Dev-only component gallery; import.meta.env.DEV is false in production builds, so it is dropped.
const Styleguide = import.meta.env.DEV ? lazy(() => import('./ui/styleguide/Styleguide')) : null
const Gallery = import.meta.env.DEV ? lazy(() => import('./ui/styleguide/Gallery')) : null
const RaceLab = import.meta.env.DEV ? lazy(() => import('./gm/display/RaceLab')) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ClientApp />} />
        {/* A scanned kupong. Same app: ClientApp parks the code and cleans the URL, so this also
            works on a phone that has never been here (onboarding runs first). */}
        <Route path="/k/:code" element={<ClientApp />} />
        <Route
          path="/gm/*"
          element={
            <Suspense fallback={<LoadingScreen label={GM_LOADING} />}>
              <GmApp />
            </Suspense>
          }
        />
        {Styleguide && Gallery && RaceLab && (
          <>
            <Route path="/styleguide" element={<Suspense><Styleguide /></Suspense>} />
            <Route path="/styleguide/frame" element={<Suspense><Gallery /></Suspense>} />
            <Route path="/styleguide/race" element={<Suspense><RaceLab /></Suspense>} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
