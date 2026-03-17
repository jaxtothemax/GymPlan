import { Suspense, lazy, useEffect, type ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { Toast } from './components/Toast'
import { BottomNav } from './components/BottomNav'
import Training from './pages/Training'
import Tracker from './pages/Tracker'
import SessionDetail from './pages/SessionDetail'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import { seedDefaultData } from './lib/seedData'

const Progress = lazy(() => import('./pages/Progress'))
const Nutrition = lazy(() => import('./pages/Nutrition'))
const Profile = lazy(() => import('./pages/Profile'))
const Rules = lazy(() => import('./pages/Rules'))

function SuspenseFallback() {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: '2px solid var(--border)',
        borderTopColor: 'var(--blue)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <SuspenseFallback />
  }

  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

function SeedRunner() {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      seedDefaultData(user.id).catch(console.error)
    }
  }, [user])

  return null
}

function ToastRenderer() {
  const { toast, dismissToast } = useToast()
  if (!toast) return null
  return <Toast message={toast} onDismiss={dismissToast} />
}

function AppRoutes() {
  return (
    <>
      <SeedRunner />
      <ToastRenderer />
      <Routes>
        {/* Auth routes */}
        <Route path="/auth/signin" element={<SignIn />} />
        <Route path="/auth/signup" element={<SignUp />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout>
                <Training />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/tracker"
          element={
            <RequireAuth>
              <AppLayout>
                <Tracker />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/progress"
          element={
            <RequireAuth>
              <AppLayout>
                <Suspense fallback={<SuspenseFallback />}>
                  <Progress />
                </Suspense>
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/progress/session/:id"
          element={
            <RequireAuth>
              <AppLayout>
                <SessionDetail />
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/nutrition"
          element={
            <RequireAuth>
              <AppLayout>
                <Suspense fallback={<SuspenseFallback />}>
                  <Nutrition />
                </Suspense>
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <AppLayout>
                <Suspense fallback={<SuspenseFallback />}>
                  <Profile />
                </Suspense>
              </AppLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/rules"
          element={
            <RequireAuth>
              <AppLayout>
                <Suspense fallback={<SuspenseFallback />}>
                  <Rules />
                </Suspense>
              </AppLayout>
            </RequireAuth>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
