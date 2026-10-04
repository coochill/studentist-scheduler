import { LockKeyhole, LogIn, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { authenticate } from '../auth'
import logo from '../assets/logo.svg'

interface AuthPageProps {
  onAuthenticated: () => void
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!await authenticate(email, password)) {
      setError('The email or password is not authorized for this workspace.')
      return
    }

    onAuthenticated()
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <img src={logo} alt="SchedPx" className="auth-logo" />
          <span className="auth-status"><ShieldCheck size={15} /> Private workspace</span>
        </div>
        <div className="auth-heading">
          <p className="section-kicker">Patient scheduler</p>
          <h1 id="auth-title">Sign in to continue</h1>
          <p>Use the authorized account to access clinic schedules and patient records.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="auth-password">Password</label>
          <input id="auth-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit"><LogIn size={17} />Sign in</button>
        </form>
        <p className="auth-note"><LockKeyhole size={14} /> Your session ends when you sign out or close this browser session.</p>
      </section>
    </main>
  )
}
