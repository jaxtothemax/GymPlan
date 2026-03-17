import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <div
        className={`sheet-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`sheet-container ${open ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '12px',
            paddingBottom: '4px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              background: 'var(--surface-3)',
            }}
          />
        </div>

        {/* Title */}
        {title && (
          <div
            style={{
              padding: '12px 20px 16px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <h2 className="title" style={{ color: 'var(--text-1)' }}>
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
      </div>
    </>
  )
}
