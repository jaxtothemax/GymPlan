import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { LoggedSession, LoggedSet } from '../lib/types'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: session, isLoading } = useQuery({
    queryKey: ['logged-session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logged_sessions')
        .select('*')
        .eq('id', id!)
        .eq('user_id', user!.id)
        .single()
      if (error) throw error
      return data as LoggedSession
    },
    enabled: !!id && !!user,
  })

  const { data: sets = [] } = useQuery({
    queryKey: ['logged-sets', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logged_sets')
        .select('*')
        .eq('logged_session_id', id!)
        .order('exercise_name', { ascending: true })
        .order('set_number', { ascending: true })
      if (error) throw error
      return data as LoggedSet[]
    },
    enabled: !!id,
  })

  // Group sets by exercise
  const byExercise: Record<string, LoggedSet[]> = {}
  for (const s of sets) {
    const key = s.exercise_name
    if (!byExercise[key]) byExercise[key] = []
    byExercise[key].push(s)
  }

  if (isLoading) {
    return (
      <div style={{
        height: '100%',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <p className="body" style={{ color: 'var(--text-2)' }}>Loading…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{
        height: '100%',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p className="body" style={{ color: 'var(--text-2)', marginBottom: '16px' }}>Session not found.</p>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: '15px' }}
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: 'calc(16px + env(safe-area-inset-top))',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 24px)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 16px 16px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-1)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="title" style={{ color: 'var(--text-1)' }}>{session.session_name}</h1>
          <p className="caption" style={{ color: 'var(--text-2)' }}>{formatDate(session.logged_date)}</p>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {Object.entries(byExercise).map(([exerciseName, exerciseSets]) => {
          const totalVolume = exerciseSets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0)
          return (
            <div
              key={exerciseName}
              style={{
                background: 'var(--surface-1)',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                marginBottom: '10px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p className="body-strong" style={{ color: 'var(--text-1)' }}>{exerciseName}</p>
                <span style={{
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: 'var(--green-dim)',
                  color: 'var(--green)',
                  fontWeight: 600,
                }}>
                  {totalVolume > 0 ? `${totalVolume.toFixed(0)}kg vol` : '—'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {exerciseSets.map((s, idx) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      background: 'var(--surface-2)',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', width: '28px' }}>
                      S{idx + 1}
                    </span>
                    <span className="body" style={{ color: 'var(--text-1)' }}>
                      {s.reps ?? '—'} reps
                    </span>
                    <span className="caption" style={{ color: 'var(--text-3)' }}>@</span>
                    <span className="body-strong" style={{ color: 'var(--blue)' }}>
                      {s.weight_kg != null ? `${s.weight_kg}kg` : '—'}
                    </span>
                    {s.reps != null && s.weight_kg != null && (
                      <span className="caption" style={{ color: 'var(--text-3)', marginLeft: 'auto' }}>
                        {(s.reps * s.weight_kg).toFixed(0)}kg
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {sets.length === 0 && (
          <p className="body" style={{ color: 'var(--text-2)', textAlign: 'center', marginTop: '40px' }}>
            No sets logged for this session.
          </p>
        )}
      </div>
    </div>
  )
}
