import { useState, useCallback, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { WorkoutSession, Exercise, LoggedSession, LoggedSet } from '../lib/types'

interface SetRow {
  id: string
  reps: string
  weight_kg: string
}

function genId() {
  return Math.random().toString(36).slice(2)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const inputStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-1)',
  fontSize: '15px',
  width: '100%',
}

export default function Tracker() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set())
  // Local sets state: exerciseId -> SetRow[]
  const [setsData, setSetsData] = useState<Record<string, SetRow[]>>({})

  // ---- Queries ----
  const { data: activeProgramme } = useQuery({
    queryKey: ['active-programme', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single()
      if (error) return null
      return data
    },
    enabled: !!user,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', activeProgramme?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('programme_id', activeProgramme!.id)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as WorkoutSession[]
    },
    enabled: !!activeProgramme,
  })

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises-all', activeProgramme?.id],
    queryFn: async () => {
      if (!sessions.length) return []
      const sessionIds = sessions.map(s => s.id)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .in('workout_session_id', sessionIds)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Exercise[]
    },
    enabled: !!activeProgramme && sessions.length > 0,
  })

  // Previous logged sessions for each exercise
  const { data: allLoggedSessions = [] } = useQuery({
    queryKey: ['logged-sessions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logged_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('logged_date', { ascending: false })
      if (error) throw error
      return data as LoggedSession[]
    },
    enabled: !!user,
  })

  const { data: allLoggedSets = [] } = useQuery({
    queryKey: ['all-logged-sets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logged_sets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as LoggedSet[]
    },
    enabled: !!user,
  })

  // ---- Derived data ----
  const selectedSession = sessions.find(s => s.id === selectedSessionId) ?? sessions[0] ?? null
  const sessionExercises = exercises
    .filter(e => e.workout_session_id === (selectedSession?.id))
    .sort((a, b) => a.sort_order - b.sort_order)

  // Get previous session data for a given exercise
  function getPreviousData(exerciseId: string): { session: LoggedSession; sets: LoggedSet[] } | null {
    const relevantSets = allLoggedSets.filter(s => s.exercise_id === exerciseId)
    if (!relevantSets.length) return null
    const sessionId = relevantSets[0].logged_session_id
    const session = allLoggedSessions.find(s => s.id === sessionId)
    if (!session) return null
    const sets = relevantSets.filter(s => s.logged_session_id === sessionId).sort((a, b) => a.set_number - b.set_number)
    return { session, sets }
  }

  // Init sets for an exercise when first expanding
  const initSets = useCallback((exercise: Exercise) => {
    if (setsData[exercise.id]) return
    const prevData = getPreviousData(exercise.id)
    let initial: SetRow[]
    if (prevData?.sets.length) {
      initial = prevData.sets.map(s => ({
        id: genId(),
        reps: s.reps?.toString() ?? '',
        weight_kg: s.weight_kg?.toString() ?? '',
      }))
    } else {
      initial = Array.from({ length: exercise.default_sets }, () => ({
        id: genId(),
        reps: '',
        weight_kg: '',
      }))
    }
    setSetsData(prev => ({ ...prev, [exercise.id]: initial }))
  }, [setsData, allLoggedSets, allLoggedSessions]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExercise(exerciseId: string, exercise: Exercise) {
    setExpandedExercises(prev => {
      const next = new Set(prev)
      if (next.has(exerciseId)) {
        next.delete(exerciseId)
      } else {
        next.add(exerciseId)
        initSets(exercise)
      }
      return next
    })
  }

  function updateSet(exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) {
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).map(s => s.id === setId ? { ...s, [field]: value } : s),
    }))
  }

  function addSet(exerciseId: string) {
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: [...(prev[exerciseId] ?? []), { id: genId(), reps: '', weight_kg: '' }],
    }))
  }

  function removeSet(exerciseId: string, setId: string) {
    setSetsData(prev => ({
      ...prev,
      [exerciseId]: (prev[exerciseId] ?? []).filter(s => s.id !== setId),
    }))
  }

  const saveSession = useMutation({
    mutationFn: async () => {
      if (!selectedSession || !user) return

      // Upsert logged_session
      const { data: loggedSess, error: sessErr } = await supabase
        .from('logged_sessions')
        .upsert({
          user_id: user.id,
          workout_session_id: selectedSession.id,
          programme_id: activeProgramme?.id ?? null,
          session_name: selectedSession.name,
          logged_date: selectedDate,
          notes: null,
        }, { onConflict: 'user_id,workout_session_id,logged_date' })
        .select()
        .single()

      if (sessErr || !loggedSess) {
        // If upsert not available, try insert/update manually
        const { data: existingSess } = await supabase
          .from('logged_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('workout_session_id', selectedSession.id)
          .eq('logged_date', selectedDate)
          .single()

        let sessionId: string
        if (existingSess) {
          sessionId = existingSess.id
        } else {
          const { data: newSess, error: newErr } = await supabase
            .from('logged_sessions')
            .insert({
              user_id: user.id,
              workout_session_id: selectedSession.id,
              programme_id: activeProgramme?.id ?? null,
              session_name: selectedSession.name,
              logged_date: selectedDate,
              notes: null,
            })
            .select()
            .single()
          if (newErr || !newSess) throw newErr ?? new Error('Failed to create session')
          sessionId = newSess.id
        }

        // Delete existing sets for this session
        await supabase.from('logged_sets').delete().eq('logged_session_id', sessionId)

        // Insert sets
        const setsToInsert: object[] = []
        for (const exercise of sessionExercises) {
          const sets = setsData[exercise.id] ?? []
          sets.forEach((s, idx) => {
            if (s.reps || s.weight_kg) {
              setsToInsert.push({
                logged_session_id: sessionId,
                user_id: user.id,
                exercise_id: exercise.id,
                exercise_name: exercise.name,
                set_number: idx + 1,
                reps: s.reps ? parseInt(s.reps) : null,
                weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
              })
            }
          })
        }
        if (setsToInsert.length > 0) {
          const { error: setsErr } = await supabase.from('logged_sets').insert(setsToInsert)
          if (setsErr) throw setsErr
        }
        return
      }

      const loggedSessionId = loggedSess.id
      // Delete existing sets
      await supabase.from('logged_sets').delete().eq('logged_session_id', loggedSessionId)

      // Insert sets
      const setsToInsert: object[] = []
      for (const exercise of sessionExercises) {
        const sets = setsData[exercise.id] ?? []
        sets.forEach((s, idx) => {
          if (s.reps || s.weight_kg) {
            setsToInsert.push({
              logged_session_id: loggedSessionId,
              user_id: user.id,
              exercise_id: exercise.id,
              exercise_name: exercise.name,
              set_number: idx + 1,
              reps: s.reps ? parseInt(s.reps) : null,
              weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
            })
          }
        })
      }
      if (setsToInsert.length > 0) {
        const { error: setsErr } = await supabase.from('logged_sets').insert(setsToInsert)
        if (setsErr) throw setsErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logged-sessions', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['all-logged-sets', user?.id] })
      showToast('Session saved!')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: 'calc(16px + env(safe-area-inset-top))',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 80px)',
    }}>
      <div style={{ padding: '0 16px' }}>
        <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '16px' }}>Tracker</h1>

        {/* Session selector pills */}
        {sessions.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSessionId(s.id)
                  setExpandedExercises(new Set())
                  setSetsData({})
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  border: `1px solid ${selectedSession?.id === s.id ? 'var(--blue)' : 'var(--border)'}`,
                  background: selectedSession?.id === s.id ? 'var(--blue-dim)' : 'var(--surface-1)',
                  color: selectedSession?.id === s.id ? 'var(--blue)' : 'var(--text-2)',
                  fontSize: '13px',
                  fontWeight: selectedSession?.id === s.id ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Date row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px 14px',
          background: 'var(--surface-1)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-1)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          />
          <button
            onClick={() => setSelectedDate(today())}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--blue)',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Today
          </button>
          {selectedDate !== today() && (
            <button
              onClick={() => setSelectedDate(today())}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                fontSize: '13px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Exercise accordions */}
        {selectedSession && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sessionExercises.map(exercise => {
              const isExpanded = expandedExercises.has(exercise.id)
              const sets = setsData[exercise.id] ?? []
              const prevData = getPreviousData(exercise.id)

              return (
                <div
                  key={exercise.id}
                  style={{
                    background: 'var(--surface-1)',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div
                    onClick={() => toggleExercise(exercise.id, exercise)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '13px 14px',
                      cursor: 'pointer',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p className="body-strong" style={{ color: 'var(--text-1)' }}>{exercise.name}</p>
                      <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                        {exercise.default_sets} sets
                        {exercise.rep_range_min != null ? ` · ${exercise.rep_range_min}${exercise.rep_range_max ? `–${exercise.rep_range_max}` : ''} reps` : ''}
                      </p>
                    </div>
                    <div style={{ color: 'var(--text-3)' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Body */}
                  <div
                    className="accordion-body"
                    style={{ maxHeight: isExpanded ? '2000px' : '0' }}
                  >
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
                      {/* Previous session */}
                      {prevData && (
                        <div style={{
                          background: 'var(--blue-dim)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          marginBottom: '12px',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                        }}>
                          <p className="caption" style={{ color: 'var(--blue)', fontWeight: 600, flexShrink: 0 }}>
                            {formatDate(prevData.session.logged_date)}
                          </p>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {prevData.sets.map(s => (
                              <span
                                key={s.id}
                                style={{
                                  fontSize: '12px',
                                  padding: '2px 8px',
                                  borderRadius: '100px',
                                  background: 'var(--blue)',
                                  color: '#fff',
                                  fontWeight: 500,
                                }}
                              >
                                {s.reps ?? '–'}×{s.weight_kg ?? '–'}kg
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Set rows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sets.map((set, idx) => (
                          <div key={set.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--text-3)',
                                width: '28px',
                                flexShrink: 0,
                              }}
                            >
                              S{idx + 1}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label className="caption" style={{ color: 'var(--text-3)', fontSize: '11px' }}>Reps</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={set.reps}
                                  onChange={e => updateSet(exercise.id, set.id, 'reps', e.target.value)}
                                  style={inputStyle}
                                  placeholder="0"
                                  min={0}
                                />
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label className="caption" style={{ color: 'var(--text-3)', fontSize: '11px' }}>Weight (kg)</label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  value={set.weight_kg}
                                  onChange={e => updateSet(exercise.id, set.id, 'weight_kg', e.target.value)}
                                  style={inputStyle}
                                  placeholder="0"
                                  min={0}
                                  step={0.5}
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeSet(exercise.id, set.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-3)',
                                cursor: 'pointer',
                                padding: '4px',
                                flexShrink: 0,
                                marginTop: '14px',
                              }}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add set */}
                      <button
                        onClick={() => addSet(exercise.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '10px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--blue)',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        <Plus size={15} />
                        Add set
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!activeProgramme && (
          <p className="body" style={{ color: 'var(--text-2)', textAlign: 'center', marginTop: '40px' }}>
            No active programme. Create one in the Training tab.
          </p>
        )}
      </div>

      {/* Save button - fixed above bottom nav */}
      {selectedSession && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(56px + env(safe-area-inset-bottom))',
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: 'var(--bg)',
          borderTop: '1px solid var(--border)',
          zIndex: 50,
        }}>
          <button
            onClick={() => saveSession.mutate()}
            disabled={saveSession.isPending}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              background: 'var(--blue)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              cursor: saveSession.isPending ? 'not-allowed' : 'pointer',
              opacity: saveSession.isPending ? 0.7 : 1,
            }}
          >
            {saveSession.isPending ? 'Saving…' : 'Save session'}
          </button>
        </div>
      )}
    </div>
  )
}
