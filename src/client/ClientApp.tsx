// Placeholder for the guest app (Stage 5).
import { BonusBar, Logo } from '../ui'

export default function ClientApp() {
  return (
    <div className="flex min-h-dvh flex-col">
      <BonusBar />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo size="lg" />
        <p className="text-lg text-ink-dim">Spelet öppnar snart.</p>
      </main>
    </div>
  )
}
