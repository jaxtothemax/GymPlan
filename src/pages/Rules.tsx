import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const RULES = [
  {
    title: 'Rule 1 — Train to the edge, not over it',
    body: `The goal is to apply enough stimulus to force adaptation without causing injury or excessive fatigue. For most sets, stop 2–3 reps short of failure. On the final set of isolation exercises, you can train to failure or use lengthened partials. Never train compound lifts (squat, deadlift, hip thrust) to failure.`,
  },
  {
    title: 'Rule 2 — Progressive overload every session',
    body: `Each session, aim to add 1 rep to any set, or add the smallest weight increment available (usually 2.5kg). If you hit the top of the rep range on all sets, increase the weight next session. Track every set — if you don't write it down, it didn't happen.`,
  },
  {
    title: 'Rule 3 — Form over weight, always',
    body: `Ego-lifting with poor form is the fastest route to injury and the slowest route to progress. Use the cues in each exercise. Record yourself from the side occasionally. If you can't hit the bottom of the rep range with good form, the weight is too heavy.`,
  },
  {
    title: 'Rule 4 — Recovery is training',
    body: `Muscle is built outside the gym. Aim for 7–9 hours of sleep. Eat in a modest caloric surplus (200–300 kcal above maintenance). Hit your protein target every single day — this is non-negotiable. Deload every 8–12 weeks by dropping volume by 40–50% for one week.`,
  },
]

const LOOSE_LIGAMENT_DOS = [
  'Controlled tempo — no bouncing',
  'Neutral spine on all hinge patterns',
  'Warm up joints before loading',
  'Strengthen muscles around the joint',
  'Stop 3+ reps shy of failure on compounds',
]

const LOOSE_LIGAMENT_AVOIDS = [
  'Hyperextension of knees/elbows',
  'Training through joint pain',
  'Olympic lifts with hypermobile joints',
  'Ballistic/plyometric movements',
  'Max-effort one-rep attempts',
]

export default function Rules() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]))

  function toggle(idx: number) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: 'calc(16px + env(safe-area-inset-top))',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 24px)',
    }}>
      <div style={{ padding: '0 16px' }}>
        <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '6px' }}>Training Rules</h1>
        <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '20px' }}>
          Evidence-based principles for safe, effective hypertrophy training.
        </p>

        {/* Training rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {RULES.map((rule, idx) => {
            const isExpanded = expanded.has(idx)
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => toggle(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '14px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    gap: '12px',
                    textAlign: 'left',
                  }}
                >
                  <span className="body-strong" style={{ color: 'var(--text-1)', flex: 1 }}>
                    {rule.title}
                  </span>
                  <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>

                <div className="accordion-body" style={{ maxHeight: isExpanded ? '1000px' : '0' }}>
                  <div style={{
                    padding: '0 14px 14px',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '12px',
                  }}>
                    <p className="body" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                      {rule.body}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Loose ligament section */}
        <div style={{ marginBottom: '16px' }}>
          <h2 className="title" style={{ color: 'var(--text-1)', marginBottom: '6px' }}>
            Loose ligament guidance
          </h2>
          <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '16px' }}>
            For hypermobile joints, extra care is needed to build stability before loading.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {/* Do */}
          <div style={{
            background: 'var(--green-dim)',
            borderRadius: '14px',
            padding: '14px',
            border: '1px solid var(--border)',
          }}>
            <p className="label" style={{ color: 'var(--green)', marginBottom: '10px' }}>Do</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {LOOSE_LIGAMENT_DOS.map(item => (
                <div
                  key={item}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(52,201,122,0.12)',
                    fontSize: '12px',
                    color: 'var(--green)',
                    fontWeight: 500,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Avoid */}
          <div style={{
            background: 'var(--red-dim)',
            borderRadius: '14px',
            padding: '14px',
            border: '1px solid var(--border)',
          }}>
            <p className="label" style={{ color: 'var(--red)', marginBottom: '10px' }}>Avoid</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {LOOSE_LIGAMENT_AVOIDS.map(item => (
                <div
                  key={item}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,77,77,0.10)',
                    fontSize: '12px',
                    color: 'var(--red)',
                    fontWeight: 500,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="note-box info">
          <p className="body-strong" style={{ marginBottom: '4px' }}>Scientific basis</p>
          <p className="caption" style={{ color: 'var(--text-2)' }}>
            These guidelines are derived from Built With Science research content by Jeremy Ethier.
            Individual variation applies — listen to your body and consult a physiotherapist for specific joint issues.
          </p>
        </div>
      </div>
    </div>
  )
}
