import { NavLink } from 'react-router-dom'
import { Dumbbell, BarChart2, TrendingUp, Utensils, User } from 'lucide-react'

const tabs = [
  { to: '/', label: 'Training', icon: Dumbbell, exact: true },
  { to: '/tracker', label: 'Tracker', icon: BarChart2, exact: false },
  { to: '/progress', label: 'Progress', icon: TrendingUp, exact: false },
  { to: '/nutrition', label: 'Nutrition', icon: Utensils, exact: false },
  { to: '/profile', label: 'Profile', icon: User, exact: false },
]

export function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(56px + env(safe-area-inset-bottom))',
        background: 'var(--surface-1)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 100,
      }}
    >
      {tabs.map(({ to, label, icon: Icon, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          style={{ flex: 1, textDecoration: 'none' }}
        >
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: '8px',
                gap: '3px',
                color: isActive ? 'var(--blue)' : 'var(--text-3)',
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
