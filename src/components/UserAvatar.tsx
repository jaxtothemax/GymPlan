interface UserAvatarProps {
  name?: string | null
  email?: string | null
  size?: number
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'GP'
}

export function UserAvatar({ name, email, size = 56 }: UserAvatarProps) {
  const initials = getInitials(name, email)

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--blue-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span
        className="body-strong"
        style={{
          color: 'var(--blue)',
          fontSize: size < 40 ? '13px' : '15px',
          letterSpacing: '0.5px',
        }}
      >
        {initials}
      </span>
    </div>
  )
}
