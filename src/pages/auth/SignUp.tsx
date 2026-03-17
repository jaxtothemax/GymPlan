import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'

const schema = z.object({
  displayName: z.string().optional(),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const inputStyle = (hasError: boolean): CSSProperties => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: `1px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
  background: 'var(--surface-1)',
  color: 'var(--text-1)',
  fontSize: '16px',
})

export default function SignUp() {
  const { signUp } = useAuth()
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
      await signUp(data.email, data.password, data.displayName)
      navigate('/')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed'
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
            Create account
          </h1>
          <p className="caption" style={{ color: 'var(--text-2)' }}>
            Join GymPlan and start tracking.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Display name */}
          <div style={{ marginBottom: '16px' }}>
            <label className="caption" style={{ color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
              Name (optional)
            </label>
            <input
              type="text"
              autoComplete="name"
              {...register('displayName')}
              style={inputStyle(false)}
              placeholder="e.g. Jax"
            />
          </div>

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
              style={inputStyle(!!errors.email)}
            />
            {errors.email && (
              <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label className="caption" style={{ color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password')}
              style={inputStyle(!!errors.password)}
            />
            {errors.password && (
              <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: '24px' }}>
            <label className="caption" style={{ color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              style={inputStyle(!!errors.confirmPassword)}
            />
            {errors.confirmPassword && (
              <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>
                {errors.confirmPassword.message}
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
              fontSize: '16px',
              fontWeight: 600,
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
              marginBottom: '16px',
            }}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <p className="caption" style={{ color: 'var(--text-2)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link
              to="/auth/signin"
              style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
