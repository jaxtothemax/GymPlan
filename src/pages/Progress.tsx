import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Dot,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Exercise, LoggedSession, LoggedSet } from '../lib/types'

type TimeRange = '30d' | '90d' | 'all'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Progress() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('')
  const [timeRange, setTimeRange] = useState<TimeRange>('90d')

  const { data: activeProgramme } = useQuery({
    queryKey: ['active-programme', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('programmes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single()
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
      return data
    },
    enabled: !!activeProgramme,
  })

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises-all', activeProgramme?.id],
    queryFn: async () => {
      if (!sessions.length) return []
      const sessionIds = sessions.map((s: { id: string }) => s.id)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .in('workout_session_id', sessionIds)
        .order('name', { ascending: true })
      if (error) throw error
      return data as Exercise[]
    },
    enabled: !!activeProgramme && sessions.length > 0,
  })

  const { data: loggedSessions = [] } = useQuery({
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

  const { data: loggedSets = [] } = useQuery({
    queryKey: ['all-logged-sets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('logged_sets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as LoggedSet[]
    },
    enabled: !!user,
  })

  // ---- Filter by time range ----
  const now = new Date()
  const cutoff: Date | null =
    timeRange === '30d'
      ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      : timeRange === '90d'
      ? new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      : null

  // ---- Chart data ----
  const selectedExercise = exercises.find(e => e.id === selectedExerciseId)

  const chartData = (() => {
    if (!selectedExerciseId) return []
    const relevantSets = loggedSets.filter(s => s.exercise_id === selectedExerciseId)
    // Group by logged_session
    const bySession: Record<string, LoggedSet[]> = {}
    for (const s of relevantSets) {
      if (!bySession[s.logged_session_id]) bySession[s.logged_session_id] = []
      bySession[s.logged_session_id].push(s)
    }
    const points: { date: string; maxWeight: number; totalVolume: number }[] = []
    for (const [sessionId, sets] of Object.entries(bySession)) {
      const session = loggedSessions.find(s => s.id === sessionId)
      if (!session) continue
      if (cutoff && new Date(session.logged_date) < cutoff) continue
      const maxWeight = Math.max(...sets.map(s => s.weight_kg ?? 0))
      const totalVolume = sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0)
      points.push({ date: session.logged_date, maxWeight, totalVolume })
    }
    return points.sort((a, b) => a.date.localeCompare(b.date)).map(p => ({
      ...p,
      dateLabel: formatDate(p.date),
    }))
  })()

  // ---- General dashboard (no exercise selected) ----
  const totalSessions = loggedSessions.length
  const totalVolume = loggedSets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0)
  const volumeLabel = totalVolume >= 1000
    ? `${(totalVolume / 1000).toFixed(1)}t`
    : `${totalVolume.toFixed(0)}kg`

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisWeekCount = loggedSessions.filter(s => new Date(s.logged_date + 'T12:00:00') >= weekAgo).length

  const weeklyActivity = (() => {
    const weeks: { label: string; sessions: number; volume: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now)
      end.setDate(now.getDate() - i * 7)
      const start = new Date(end)
      start.setDate(end.getDate() - 6)
      const wkSessions = loggedSessions.filter(s => {
        const d = new Date(s.logged_date + 'T12:00:00')
        return d >= start && d <= end
      })
      const vol = wkSessions.reduce((sum, ls) =>
        sum + loggedSets.filter(s => s.logged_session_id === ls.id)
          .reduce((v, s) => v + (s.reps ?? 0) * (s.weight_kg ?? 0), 0), 0)
      weeks.push({
        label: i === 0 ? 'Now' : start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        sessions: wkSessions.length,
        volume: Math.round(vol),
      })
    }
    return weeks
  })()

  const recentSessions = [...loggedSessions].slice(0, 5)

  const topLifts = exercises
    .map(exercise => {
      const sets = loggedSets.filter(s => s.exercise_id === exercise.id)
      if (!sets.length) return null
      const best = sets.reduce<LoggedSet | null>((b, s) =>
        !b || (s.weight_kg ?? 0) > (b.weight_kg ?? 0) ? s : b, null)
      return best ? { name: exercise.name, weight: best.weight_kg ?? 0, reps: best.reps ?? 0 } : null
    })
    .filter((p): p is { name: string; weight: number; reps: number } => p !== null && p.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)

  // ---- Personal records ----
  const allSetsForExercise = loggedSets.filter(s => s.exercise_id === selectedExerciseId)
  const heaviestSet = allSetsForExercise.reduce<LoggedSet | null>((best, s) => {
    if (!best || (s.weight_kg ?? 0) > (best.weight_kg ?? 0)) return s
    return best
  }, null)
  const bestVolumeBySession: Record<string, number> = {}
  for (const s of allSetsForExercise) {
    const v = (s.reps ?? 0) * (s.weight_kg ?? 0)
    bestVolumeBySession[s.logged_session_id] = (bestVolumeBySession[s.logged_session_id] ?? 0) + v
  }
  const bestSessionVolume = Math.max(...Object.values(bestVolumeBySession), 0)

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: 'calc(16px + env(safe-area-inset-top))',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 24px)',
    }}>
      <div style={{ padding: '0 16px' }}>
        <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '16px' }}>Progress</h1>

        {/* Exercise selector */}
        <div style={{ marginBottom: '14px' }}>
          <select
            value={selectedExerciseId}
            onChange={e => setSelectedExerciseId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              background: 'var(--surface-1)',
              color: selectedExerciseId ? 'var(--text-1)' : 'var(--text-3)',
              fontSize: '15px',
            }}
          >
            <option value="">Select an exercise…</option>
            {exercises.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {/* Chart + per-exercise detail */}
        {selectedExerciseId && (
          <>
          {/* Time range */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-1)',
            borderRadius: '10px',
            padding: '3px',
            gap: '3px',
            marginBottom: '16px',
            border: '1px solid var(--border)',
          }}>
            {(['30d', '90d', 'all'] as TimeRange[]).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '8px',
                  border: 'none',
                  background: timeRange === r ? 'var(--blue)' : 'transparent',
                  color: timeRange === r ? '#fff' : 'var(--text-2)',
                  fontSize: '13px',
                  fontWeight: timeRange === r ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {r === 'all' ? 'All time' : r}
              </button>
            ))}
          </div>
          </>
        )}

        {selectedExerciseId && (
          <>
            <div style={{
              background: 'var(--surface-1)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '16px',
              marginBottom: '14px',
            }}>
              <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '12px' }}>
                {selectedExercise?.name} — Max weight (kg)
              </p>

              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--text-3)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        fontSize: '13px',
                        color: 'var(--text-1)',
                      }}
                      labelStyle={{ color: 'var(--text-2)', marginBottom: '4px' }}
                      formatter={(value) => [`${value}kg`, 'Max weight']}
                    />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="var(--blue)"
                      strokeWidth={2.5}
                      dot={<Dot r={4} fill="var(--blue)" stroke="var(--surface-1)" strokeWidth={2} />}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p className="caption" style={{ color: 'var(--text-3)' }}>
                    {chartData.length === 0 ? 'No data yet' : 'Not enough data for chart'}
                  </p>
                </div>
              )}
            </div>

            {/* Personal records */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                background: 'var(--blue-dim)',
                borderRadius: '14px',
                padding: '14px',
                border: '1px solid var(--border)',
              }}>
                <p className="label" style={{ color: 'var(--blue)', marginBottom: '6px' }}>Heaviest set</p>
                <p className="title" style={{ color: 'var(--blue)' }}>
                  {heaviestSet?.weight_kg != null ? `${heaviestSet.weight_kg}kg` : '—'}
                </p>
                {heaviestSet && (
                  <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                    {heaviestSet.reps} reps
                  </p>
                )}
              </div>
              <div style={{
                background: 'var(--green-dim)',
                borderRadius: '14px',
                padding: '14px',
                border: '1px solid var(--border)',
              }}>
                <p className="label" style={{ color: 'var(--green)', marginBottom: '6px' }}>Best volume</p>
                <p className="title" style={{ color: 'var(--green)' }}>
                  {bestSessionVolume > 0 ? `${bestSessionVolume.toFixed(0)}kg` : '—'}
                </p>
                <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>in one session</p>
              </div>
            </div>

            {/* Session history */}
            <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Session history</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(bestVolumeBySession)
                .sort((a, b) => {
                  const dateA = loggedSessions.find(s => s.id === a[0])?.logged_date ?? ''
                  const dateB = loggedSessions.find(s => s.id === b[0])?.logged_date ?? ''
                  return dateB.localeCompare(dateA)
                })
                .map(([sessionId]) => {
                  const session = loggedSessions.find(s => s.id === sessionId)
                  if (!session) return null
                  const sets = loggedSets.filter(s => s.exercise_id === selectedExerciseId && s.logged_session_id === sessionId)
                    .sort((a, b) => a.set_number - b.set_number)

                  return (
                    <button
                      key={sessionId}
                      onClick={() => navigate(`/progress/session/${sessionId}`)}
                      style={{
                        width: '100%',
                        background: 'var(--surface-1)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p className="body-strong" style={{ color: 'var(--text-1)' }}>
                          {formatDate(session.logged_date)}
                        </p>
                        <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                          {session.session_name}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '60%' }}>
                        {sets.map(s => (
                          <span
                            key={s.id}
                            style={{
                              fontSize: '11px',
                              padding: '2px 7px',
                              borderRadius: '100px',
                              background: 'var(--surface-3)',
                              color: 'var(--text-2)',
                            }}
                          >
                            {s.reps}×{s.weight_kg}kg
                          </span>
                        ))}
                      </div>
                    </button>
                  )
                })}
            </div>
          </>
        )}

        {/* ── General dashboard (no exercise selected) ── */}
        {!selectedExerciseId && (
          <div>
            {/* Stat chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--blue-dim)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)' }}>
                <p className="label" style={{ color: 'var(--blue)', marginBottom: '6px' }}>Workouts</p>
                <p className="title" style={{ color: 'var(--blue)' }}>{totalSessions}</p>
                <p style={{ fontSize: '11px', color: 'var(--blue)', opacity: 0.7, marginTop: '2px' }}>total</p>
              </div>
              <div style={{ background: 'var(--green-dim)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)' }}>
                <p className="label" style={{ color: 'var(--green)', marginBottom: '6px' }}>Volume</p>
                <p className="title" style={{ color: 'var(--green)' }}>{volumeLabel}</p>
                <p style={{ fontSize: '11px', color: 'var(--green)', opacity: 0.7, marginTop: '2px' }}>lifted</p>
              </div>
              <div style={{ background: 'var(--amber-dim)', borderRadius: '14px', padding: '14px', border: '1px solid var(--border)' }}>
                <p className="label" style={{ color: 'var(--amber)', marginBottom: '6px' }}>This week</p>
                <p className="title" style={{ color: 'var(--amber)' }}>{thisWeekCount}</p>
                <p style={{ fontSize: '11px', color: 'var(--amber)', opacity: 0.7, marginTop: '2px' }}>sessions</p>
              </div>
            </div>

            {/* Weekly activity chart */}
            {weeklyActivity.some(w => w.sessions > 0) && (
              <div style={{ background: 'var(--surface-1)', borderRadius: '16px', border: '1px solid var(--border)', padding: '16px', marginBottom: '20px' }}>
                <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '14px' }}>Weekly sessions — last 6 weeks</p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={weeklyActivity} margin={{ top: 4, right: 4, bottom: 0, left: -28 }} barSize={22}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-3)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-1)' }}
                      formatter={(value: number, name: string) => [value, name === 'sessions' ? 'Sessions' : 'Volume']}
                      cursor={{ fill: 'var(--surface-2)' }}
                    />
                    <Bar dataKey="sessions" radius={[6, 6, 0, 0]}>
                      {weeklyActivity.map((entry, i) => (
                        <Cell key={i} fill={i === weeklyActivity.length - 1 ? 'var(--blue)' : 'var(--surface-3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <>
                <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Recent sessions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
                  {recentSessions.map(session => {
                    const sets = loggedSets.filter(s => s.logged_session_id === session.id)
                    const vol = sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight_kg ?? 0), 0)
                    return (
                      <button
                        key={session.id}
                        onClick={() => navigate(`/progress/session/${session.id}`)}
                        style={{ width: '100%', background: 'var(--surface-1)', borderRadius: '12px', border: '1px solid var(--border)', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="body-strong" style={{ color: 'var(--text-1)' }}>{session.session_name}</p>
                          <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>{formatDate(session.logged_date)}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600 }}>
                            {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${vol.toFixed(0)}kg`}
                          </p>
                          <p className="caption" style={{ color: 'var(--text-3)', marginTop: '1px' }}>{sets.length} sets</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Top lifts */}
            {topLifts.length > 0 && (
              <>
                <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Top lifts</p>
                <div style={{ background: 'var(--surface-1)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '16px' }}>
                  {topLifts.map((lift, i) => (
                    <div key={lift.name} style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: i < topLifts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-3)', width: '20px', flexShrink: 0 }}>{i + 1}</span>
                      <p className="body" style={{ color: 'var(--text-1)', flex: 1, minWidth: 0 }}>{lift.name}</p>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600 }}>{lift.weight}kg</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '6px' }}>{lift.reps} reps</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {totalSessions === 0 && (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <p className="body" style={{ color: 'var(--text-2)' }}>No sessions logged yet.</p>
                <p className="caption" style={{ color: 'var(--text-3)', marginTop: '4px' }}>Log your first workout to see your stats here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
