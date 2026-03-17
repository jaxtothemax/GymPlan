import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send reset link'
      setServerError(msg)
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        paddingTop: 'calc(32px + env(safe-area-inset-top))',
        background: 'var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '8px' }}>
            Reset password
          </h1>
          <p className="caption" style={{ color: 'var(--text-2)' }}>
            We'll send a reset link to your email.
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div className="note-box info" style={{ marginBottom: '24px', textAlign: 'left' }}>
              <p className="body-strong" style={{ marginBottom: '4px' }}>Check your inbox</p>
              <p className="caption" style={{ color: 'var(--text-2)' }}>
                We've sent a password reset link. Check your email and click the link to reset your password.
              </p>
            </div>
            <Link
              to="/auth/signin"
              style={{ color: 'var(--blue)', fontSize: '14px', textDecoration: 'none' }}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ marginBottom: '24px' }}>
              <label className="caption" style={{ color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                {...register('email')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${errors.email ? 'var(--red)' : 'var(--border)'}`,
                  background: 'var(--surface-1)',
                  color: 'var(--text-1)',
                  fontSize: '15px',
                }}
              />
              {errors.email && (
                <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {serverError && (
              <div className="note-box warning" style={{ marginBottom: '16px' }}>
                <p className="caption">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'var(--blue)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                marginBottom: '16px',
              }}
            >
              {isSubmitting ? 'Sending…' : 'Send reset link'}
            </button>

            <p className="caption" style={{ color: 'var(--text-2)', textAlign: 'center' }}>
              <Link
                to="/auth/signin"
                style={{ color: 'var(--blue)', textDecoration: 'none' }}
              >
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
