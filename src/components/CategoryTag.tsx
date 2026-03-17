type Category = 'upper' | 'lower' | 'full' | 'cardio' | 'other'

interface CategoryTagProps {
  category: Category
}

const config: Record<Category, { label: string; color: string; bg: string }> = {
  upper: { label: 'Upper', color: 'var(--blue)', bg: 'var(--blue-dim)' },
  lower: { label: 'Lower', color: 'var(--green)', bg: 'var(--green-dim)' },
  full: { label: 'Full Body', color: 'var(--amber)', bg: 'var(--amber-dim)' },
  cardio: { label: 'Cardio', color: 'var(--amber)', bg: 'var(--amber-dim)' },
  other: { label: 'Other', color: 'var(--text-2)', bg: 'var(--surface-3)' },
}

export function CategoryTag({ category }: CategoryTagProps) {
  const { label, color, bg } = config[category] ?? config.other

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.3px',
        textTransform: 'uppercase',
        color,
        background: bg,
      }}
    >
      {label}
    </span>
  )
}
