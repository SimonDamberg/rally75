import { useState, type FormEvent } from 'react'
import { toRallyError } from '../lib/errors'
import { GM_LOGIN } from '../shared/content/gm'
import { Button, Logo } from '../ui'
import { Field, TextInput } from './form'
import { useGmAuth } from './gmAuth'

export function Login() {
  const { login } = useGmAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password) return setError(GM_LOGIN.empty)
    setBusy(true)
    setError(null)
    try {
      await login(password)
    } catch (err) {
      setError(toRallyError(err).message)
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center p-8">
      <form onSubmit={submit} className="flex w-[min(34rem,100%)] flex-col gap-6">
        <Logo size="lg" />
        <div>
          <h1 className="font-display text-tv-lg font-black text-plate uppercase">{GM_LOGIN.title}</h1>
          <p className="text-2xl text-ink-dim">{GM_LOGIN.subtitle}</p>
        </div>
        <Field label={GM_LOGIN.passwordLabel} hint={GM_LOGIN.remembered}>
          <TextInput
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-2xl font-bold text-drift">
            {error}
          </p>
        )}
        <Button type="submit" size="tv" block loading={busy}>
          {GM_LOGIN.submit}
        </Button>
      </form>
    </main>
  )
}
