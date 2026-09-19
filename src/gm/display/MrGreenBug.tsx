// The umbrella brand's corner logo on the iPad while a race runs and while its result holds, like a
// TV channel's corner logo: small and a little faded, so it credits Mr Green without competing with
// the race.
import { MrGreenLogo } from '../../ui'

export function MrGreenBug({ className }: { className?: string }) {
  return (
    <span className={className}>
      <MrGreenLogo variant="mark" size="md" className="block opacity-80" />
    </span>
  )
}
