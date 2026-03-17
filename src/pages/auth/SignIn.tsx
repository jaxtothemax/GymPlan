import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      await signIn(data.email, data.password)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
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
        {/* Logo / accent mark */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div
            style={{
              width: 3,
              height: 28,
              background: 'var(--blue)',
              borderRadius: '2px',
              display: 'inline-block',
              marginBottom: '16px',
            }}
          />
          <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '8px' }}>
            GymPlan
          </h1>
          <p className="caption" style={{ color: 'var(--text-2)' }}>
            Track your workouts, progress and nutrition.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
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

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label className="caption" style={{ color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              {...register('password')}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: `1px solid ${errors.password ? 'var(--red)' : 'var(--border)'}`,
                background: 'var(--surface-1)',
                color: 'var(--text-1)',
                fontSize: '15px',
              }}
            />
            {errors.password && (
              <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div
              className="note-box warning"
              style={{ marginBottom: '16px' }}
            >
              <p className="caption">{serverError}</p>
            </div>
          )}

          {/* Submit */}
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
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          {/* Links */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link
              to="/auth/forgot-password"
              style={{ color: 'var(--blue)', fontSize: '14px', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
            <p className="caption" style={{ color: 'var(--text-2)' }}>
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
