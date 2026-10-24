import { useRef, useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
}

/** Same message for "no such user" and "wrong password", so the form never reveals which accounts exist. */
function messageFor(error: AuthError): string {
  if (error.status === 429) return 'Too many attempts. Please wait a few minutes and try again.'
  if (error.status === 400 || error.code === 'invalid_credentials') {
    return 'Incorrect email or password.'
  }
  return 'Sign in failed. Please try again.'
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase || submitting) return

    const trimmed = email.trim()
    const next: FieldErrors = {}
    if (!EMAIL_RE.test(trimmed)) next.email = 'Enter a valid email address.'
    if (password.length === 0) next.password = 'Enter your password.'

    setErrors(next)
    setFormError('')
    if (next.email) {
      emailRef.current?.focus()
      return
    }
    if (next.password) {
      passwordRef.current?.focus()
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password })
      if (error) {
        setPassword('')
        setFormError(messageFor(error))
        passwordRef.current?.focus()
      }
      // On success the auth listener updates the session and this screen is replaced.
    } catch {
      setFormError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-card">
      <p className="eyebrow">CYBER // REALITY</p>
      <h1 className="admin-card__title">Admin sign in</h1>

      <form className="admin-form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="admin-email">
            Email
          </label>
          <input
            ref={emailRef}
            id="admin-email"
            className="field__input"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'admin-email-error' : undefined}
            disabled={submitting}
          />
          {errors.email && (
            <p id="admin-email-error" className="field__error">
              {errors.email}
            </p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="admin-password">
            Password
          </label>
          <input
            ref={passwordRef}
            id="admin-password"
            className="field__input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'admin-password-error' : undefined}
            disabled={submitting}
          />
          {errors.password && (
            <p id="admin-password-error" className="field__error">
              {errors.password}
            </p>
          )}
        </div>

        {formError && (
          <p className="alert alert--error" role="alert">
            {formError}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="admin-card__note">
        Access is limited to the site owner. There is no public registration.
      </p>
    </div>
  )
}