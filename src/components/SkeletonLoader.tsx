export function SkeletonLoader() {
  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Programme header skeleton */}
      <div style={{ marginBottom: '8px' }}>
        <div className="skeleton" style={{ height: '32px', width: '220px', marginBottom: '8px' }} />
        <div className="skeleton" style={{ height: '16px', width: '160px' }} />
      </div>

      {/* Session card skeletons */}
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          style={{
            background: 'var(--surface-1)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div className="skeleton" style={{ height: '20px', width: '120px' }} />
            <div className="skeleton" style={{ height: '20px', width: '48px', borderRadius: '100px' }} />
          </div>
          <div className="skeleton" style={{ height: '14px', width: '80px' }} />
        </div>
      ))}
    </div>
  )
}
