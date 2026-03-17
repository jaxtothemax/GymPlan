import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10)
    const t2 = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 2200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onDismiss])

  return (
    <div
      className={`toast ${visible ? 'visible' : ''}`}
      style={{
        background: 'var(--text-1)',
        color: 'var(--bg)',
        padding: '12px 20px',
        borderRadius: '100px',
        fontSize: '15px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}
