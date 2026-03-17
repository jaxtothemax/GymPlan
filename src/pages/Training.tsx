import { useState, type ReactNode, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  GripVertical,
  Youtube,
  Plus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Programme, WorkoutSession, Exercise } from '../lib/types'
import { BottomSheet } from '../components/BottomSheet'
import { CategoryTag } from '../components/CategoryTag'
import { SkeletonLoader } from '../components/SkeletonLoader'

// ---- Zod schemas ----
const programmeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})
type ProgrammeForm = z.infer<typeof programmeSchema>

const sessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(['upper', 'lower', 'full', 'cardio', 'other']),
  day_hint: z.string().optional(),
  notes: z.string().optional(),
})
type SessionForm = z.infer<typeof sessionSchema>

const exerciseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  default_sets: z.coerce.number().int().min(1),
  rep_range_min: z.coerce.number().int().min(1).optional(),
  rep_range_max: z.coerce.number().int().min(1).optional(),
  rest_seconds: z.coerce.number().int().min(0).optional(),
  effort_notes: z.string().optional(),
  form_notes: z.string().optional(),
  youtube_url: z.string().optional(),
  replaces_exercise: z.string().optional(),
  is_superset: z.boolean().optional(),
  superset_group: z.string().optional(),
})
type ExerciseForm = {
  name: string
  default_sets: number
  rep_range_min?: number
  rep_range_max?: number
  rest_seconds?: number
  effort_notes?: string
  form_notes?: string
  youtube_url?: string
  replaces_exercise?: string
  is_superset?: boolean
  superset_group?: string
}

// ---- Small UI helpers ----
function Badge({ children, color = 'var(--text-2)', bg = 'var(--surface-3)' }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '100px',
      fontSize: '12px',
      fontWeight: 500,
      color,
      background: bg,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        padding: '0',
        cursor: 'pointer',
        color: 'var(--text-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        minWidth: '44px',
        minHeight: '44px',
      }}
    >
      {children}
    </button>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-1)',
  fontSize: '15px',
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '13px',
  color: 'var(--text-2)',
  marginBottom: '5px',
}

// ---- Sortable exercise row ----
interface SortableExerciseProps {
  exercise: Exercise
  onEdit: () => void
  onDelete: () => void
  editMode: boolean
}

function SortableExercise({ exercise, onEdit, onDelete, editMode }: SortableExerciseProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: exercise.id })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 0' }}>
        {/* Drag handle — only in edit mode */}
        {editMode && (
          <button
            {...attributes}
            {...listeners}
            style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'grab', color: 'var(--text-3)', flexShrink: 0, marginTop: '2px' }}
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name row + YouTube chip right-aligned */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="body-strong" style={{ color: 'var(--text-1)' }}>{exercise.name}</span>
              {exercise.replaces_exercise && (
                <span className="caption" style={{ color: 'var(--text-3)', fontStyle: 'italic', marginLeft: '6px' }}>
                  replaces {exercise.replaces_exercise}
                </span>
              )}
            </div>
            {exercise.youtube_url && (
              <a
                href={exercise.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                title="Watch on YouTube"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255,0,0,0.10)',
                  color: '#FF0000',
                  fontSize: '11px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  flexShrink: 0,
                  letterSpacing: '0.2px',
                }}
              >
                <Youtube size={12} />
                Watch
              </a>
            )}
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: exercise.effort_notes ? '6px' : 0 }}>
            <Badge>{exercise.default_sets} sets</Badge>
            {exercise.rep_range_min != null && (
              <Badge>
                {exercise.rep_range_min}
                {exercise.rep_range_max != null && exercise.rep_range_max !== exercise.rep_range_min
                  ? `–${exercise.rep_range_max}`
                  : ''} reps
              </Badge>
            )}
            {exercise.rest_seconds != null && (
              <Badge>{exercise.rest_seconds}s rest</Badge>
            )}
          </div>

          {exercise.effort_notes && (
            <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>
              {exercise.effort_notes}
            </p>
          )}
        </div>

        {/* Actions — only in edit mode */}
        {editMode && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            <IconBtn onClick={onEdit} title="Edit exercise">
              <Pencil size={15} />
            </IconBtn>
            <IconBtn onClick={onDelete} title="Delete exercise">
              <Trash2 size={15} color="var(--red)" />
            </IconBtn>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Main Training page ----
export default function Training() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  // Edit mode
  const [editMode, setEditMode] = useState(false)

  // Sheet states
  const [editProgSheet, setEditProgSheet] = useState(false)
  const [addSessionSheet, setAddSessionSheet] = useState(false)
  const [editSessionSheet, setEditSessionSheet] = useState<WorkoutSession | null>(null)
  const [addExerciseSheet, setAddExerciseSheet] = useState<string | null>(null) // sessionId
  const [editExerciseSheet, setEditExerciseSheet] = useState<Exercise | null>(null)
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'session' | 'exercise'; id: string } | null>(null)

  // ---- Queries ----
  const { data: programme, isLoading: progLoading } = useQuery({
    queryKey: ['active-programme', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data as Programme
    },
    enabled: !!user,
  })

  const { data: allProgrammes } = useQuery({
    queryKey: ['programmes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programmes')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Programme[]
    },
    enabled: !!user,
  })

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', programme?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('programme_id', programme!.id)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as WorkoutSession[]
    },
    enabled: !!programme,
  })

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises-all', programme?.id],
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
    enabled: !!programme && sessions.length > 0,
  })

  // ---- Mutations ----
  const updateProgramme = useMutation({
    mutationFn: async (vals: ProgrammeForm) => {
      const { error } = await supabase
        .from('programmes')
        .update({ name: vals.name, description: vals.description ?? null, updated_at: new Date().toISOString() })
        .eq('id', programme!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      setEditProgSheet(false)
      showToast('Programme updated')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const addSession = useMutation({
    mutationFn: async (vals: SessionForm) => {
      const maxOrder = sessions.length > 0 ? Math.max(...sessions.map(s => s.sort_order)) + 1 : 0
      const { error } = await supabase.from('workout_sessions').insert({
        ...vals,
        day_hint: vals.day_hint || null,
        notes: vals.notes || null,
        programme_id: programme!.id,
        user_id: user!.id,
        sort_order: maxOrder,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', programme?.id] })
      setAddSessionSheet(false)
      showToast('Session added')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const updateSession = useMutation({
    mutationFn: async ({ id, vals }: { id: string; vals: SessionForm }) => {
      const { error } = await supabase.from('workout_sessions').update({
        ...vals,
        day_hint: vals.day_hint || null,
        notes: vals.notes || null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', programme?.id] })
      setEditSessionSheet(null)
      showToast('Session updated')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions', programme?.id] })
      queryClient.invalidateQueries({ queryKey: ['exercises-all', programme?.id] })
      showToast('Session deleted')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const addExercise = useMutation({
    mutationFn: async ({ sessionId, vals }: { sessionId: string; vals: ExerciseForm }) => {
      const sessionExercises = exercises.filter(e => e.workout_session_id === sessionId)
      const maxOrder = sessionExercises.length > 0 ? Math.max(...sessionExercises.map(e => e.sort_order)) + 1 : 0
      const { error } = await supabase.from('exercises').insert({
        ...vals,
        rep_range_min: vals.rep_range_min ?? null,
        rep_range_max: vals.rep_range_max ?? null,
        rest_seconds: vals.rest_seconds ?? null,
        effort_notes: vals.effort_notes || null,
        form_notes: vals.form_notes || null,
        youtube_url: vals.youtube_url || null,
        replaces_exercise: vals.replaces_exercise || null,
        is_superset: vals.is_superset ?? false,
        superset_group: vals.superset_group || null,
        workout_session_id: sessionId,
        user_id: user!.id,
        sort_order: maxOrder,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises-all', programme?.id] })
      setAddExerciseSheet(null)
      showToast('Exercise added')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const updateExercise = useMutation({
    mutationFn: async ({ id, vals }: { id: string; vals: ExerciseForm }) => {
      const { error } = await supabase.from('exercises').update({
        ...vals,
        rep_range_min: vals.rep_range_min ?? null,
        rep_range_max: vals.rep_range_max ?? null,
        rest_seconds: vals.rest_seconds ?? null,
        effort_notes: vals.effort_notes || null,
        form_notes: vals.form_notes || null,
        youtube_url: vals.youtube_url || null,
        replaces_exercise: vals.replaces_exercise || null,
        is_superset: vals.is_superset ?? false,
        superset_group: vals.superset_group || null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises-all', programme?.id] })
      setEditExerciseSheet(null)
      showToast('Exercise updated')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const deleteExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises-all', programme?.id] })
      showToast('Exercise deleted')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const reorderExercises = useMutation({
    mutationFn: async (reordered: Exercise[]) => {
      const updates = reordered.map((e, i) =>
        supabase.from('exercises').update({ sort_order: i }).eq('id', e.id)
      )
      await Promise.all(updates)
    },
    onError: () => showToast('Could not save order'),
  })

  const switchProgramme = useMutation({
    mutationFn: async (progId: string) => {
      // Deactivate all
      await supabase.from('programmes').update({ is_active: false }).eq('user_id', user!.id)
      // Activate selected
      await supabase.from('programmes').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', progId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      showToast('Programme switched')
    },
  })

  const createProgramme = useMutation({
    mutationFn: async (vals: ProgrammeForm) => {
      // Deactivate current
      await supabase.from('programmes').update({ is_active: false }).eq('user_id', user!.id)
      const { error } = await supabase.from('programmes').insert({
        name: vals.name,
        description: vals.description ?? null,
        user_id: user!.id,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      showToast('Programme created')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  // ---- DnD sensor ----
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent, sessionId: string) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const sessionExercises = exercises.filter(e => e.workout_session_id === sessionId)
    const oldIndex = sessionExercises.findIndex(e => e.id === active.id)
    const newIndex = sessionExercises.findIndex(e => e.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(sessionExercises, oldIndex, newIndex)
    // Optimistic update
    queryClient.setQueryData(['exercises-all', programme?.id], (old: Exercise[] | undefined) => {
      if (!old) return old
      const others = old.filter(e => e.workout_session_id !== sessionId)
      return [...others, ...reordered.map((e, i) => ({ ...e, sort_order: i }))]
    })
    reorderExercises.mutate(reordered)
  }

  function toggleSession(id: string) {
    setExpandedSessions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ---- Render ----
  if (progLoading) {
    return (
      <div style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 'calc(16px + env(safe-area-inset-top))',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 24px)',
      }}>
        <SkeletonLoader />
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
      <div style={{ padding: '0 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h1 className="title-lg" style={{ color: 'var(--text-1)', flex: 1 }}>
              {programme?.name ?? 'No programme'}
            </h1>
            {editMode ? (
              <button
                onClick={() => setEditMode(false)}
                style={{
                  background: 'var(--blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '100px',
                  padding: '6px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '32px',
                }}
              >
                Done
              </button>
            ) : (
              <IconBtn onClick={() => setEditMode(true)} title="Edit programme layout">
                <Pencil size={18} color="var(--text-2)" />
              </IconBtn>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {(allProgrammes?.length ?? 0) > 1 && (
              <button
                onClick={() => {/* handled inline below */}}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', fontSize: '13px' }}
              >
                Switch programme
              </button>
            )}
            {editMode && programme && (
              <button
                onClick={() => setEditProgSheet(true)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-2)', fontSize: '13px' }}
              >
                Edit programme
              </button>
            )}
            {editMode && (
              <button
                onClick={() => {
                  const name = window.prompt('New programme name:')
                  if (name?.trim()) {
                    createProgramme.mutate({ name: name.trim() })
                  }
                }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--blue)', fontSize: '13px' }}
              >
                + New programme
              </button>
            )}
          </div>

          {/* Programme switcher */}
          {(allProgrammes?.length ?? 0) > 1 && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {allProgrammes?.map(p => (
                <button
                  key={p.id}
                  onClick={() => switchProgramme.mutate(p.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '100px',
                    border: `1px solid ${p.is_active ? 'var(--blue)' : 'var(--border)'}`,
                    background: p.is_active ? 'var(--blue-dim)' : 'var(--surface-2)',
                    color: p.is_active ? 'var(--blue)' : 'var(--text-2)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sessions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sessions.map(session => {
            const sessionExercises = exercises
              .filter(e => e.workout_session_id === session.id)
              .sort((a, b) => a.sort_order - b.sort_order)
            const isExpanded = expandedSessions.has(session.id)
            const isLower = session.category === 'lower'

            return (
              <div
                key={session.id}
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                {/* Session header */}
                <div
                  onClick={() => toggleSession(session.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span className="body-strong" style={{ color: 'var(--text-1)' }}>{session.name}</span>
                      <CategoryTag category={session.category} />
                    </div>
                    {session.day_hint && (
                      <span className="caption" style={{ color: 'var(--text-2)' }}>{session.day_hint}</span>
                    )}
                  </div>

                  {editMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                      <IconBtn onClick={() => setEditSessionSheet(session)} title="Edit session">
                        <Pencil size={15} />
                      </IconBtn>
                      <IconBtn onClick={() => setDeleteConfirm({ type: 'session', id: session.id })} title="Delete session">
                        <Trash2 size={15} color="var(--red)" />
                      </IconBtn>
                    </div>
                  )}

                  <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Accordion body */}
                <div
                  className="accordion-body"
                  style={{ maxHeight: isExpanded ? '2000px' : '0' }}
                >
                  <div style={{ borderTop: '1px solid var(--border)', padding: '0 16px' }}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, session.id)}
                    >
                      <SortableContext
                        items={sessionExercises.map(e => e.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {sessionExercises.map((exercise, idx) => {
                          const isInSuperset = exercise.is_superset && exercise.superset_group
                          const prevExercise = idx > 0 ? sessionExercises[idx - 1] : null
                          const showSupersetStart = isInSuperset &&
                            prevExercise?.superset_group !== exercise.superset_group

                          return (
                            <div key={exercise.id}>
                              {showSupersetStart && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  margin: '4px 0',
                                }}>
                                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                                  <span className="label" style={{ color: 'var(--amber)' }}>
                                    Superset {exercise.superset_group}
                                  </span>
                                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                                </div>
                              )}
                              <SortableExercise
                                exercise={exercise}
                                onEdit={() => setEditExerciseSheet(exercise)}
                                onDelete={() => setDeleteConfirm({ type: 'exercise', id: exercise.id })}
                                editMode={editMode}
                              />
                              {idx < sessionExercises.length - 1 && (
                                <div style={{ height: '1px', background: 'var(--border)' }} />
                              )}
                            </div>
                          )
                        })}
                      </SortableContext>
                    </DndContext>

                    {sessionExercises.length === 0 && (
                      <p className="caption" style={{ color: 'var(--text-3)', padding: '12px 0', textAlign: 'center' }}>
                        No exercises yet
                      </p>
                    )}

                    {/* Add exercise button — edit mode only */}
                    {editMode && (
                      <button
                        onClick={() => setAddExerciseSheet(session.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          margin: '12px 0',
                          background: 'var(--surface-2)',
                          border: '1px dashed var(--border)',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          color: 'var(--blue)',
                          fontSize: '14px',
                          fontWeight: 500,
                          width: '100%',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={16} />
                        Add exercise
                      </button>
                    )}

                    {/* Lower body warning */}
                    {isLower && (
                      <div className="note-box warning" style={{ marginBottom: '12px' }}>
                        <p className="caption" style={{ fontWeight: 600, marginBottom: '2px' }}>Loose ligament caution</p>
                        <p className="caption" style={{ color: 'var(--text-2)' }}>
                          Avoid exercises that hyperextend knees or hips. Stay 2–3 reps shy of failure on compound movements.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add session button — edit mode only */}
        {editMode && (
          <button
            onClick={() => setAddSessionSheet(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '16px',
              background: 'var(--surface-1)',
              border: '1px dashed var(--border)',
              borderRadius: '16px',
              padding: '14px',
              cursor: 'pointer',
              color: 'var(--blue)',
              fontSize: '15px',
              fontWeight: 500,
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} />
            Add session
          </button>
        )}

        {!programme && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <p className="body" style={{ color: 'var(--text-2)', marginBottom: '16px' }}>
              No active programme. Create one to get started.
            </p>
          </div>
        )}
      </div>

      {/* ---- Sheets ---- */}

      {/* Edit Programme */}
      <ProgrammeSheet
        open={editProgSheet}
        onClose={() => setEditProgSheet(false)}
        defaultValues={programme ? { name: programme.name, description: programme.description ?? '' } : undefined}
        onSubmit={(vals) => updateProgramme.mutate(vals)}
        loading={updateProgramme.isPending}
      />

      {/* Add Session */}
      <SessionSheet
        open={addSessionSheet}
        onClose={() => setAddSessionSheet(false)}
        onSubmit={(vals) => addSession.mutate(vals)}
        loading={addSession.isPending}
        title="Add session"
      />

      {/* Edit Session */}
      {editSessionSheet && (
        <SessionSheet
          open={!!editSessionSheet}
          onClose={() => setEditSessionSheet(null)}
          defaultValues={{
            name: editSessionSheet.name,
            category: editSessionSheet.category,
            day_hint: editSessionSheet.day_hint ?? '',
            notes: editSessionSheet.notes ?? '',
          }}
          onSubmit={(vals) => updateSession.mutate({ id: editSessionSheet.id, vals })}
          loading={updateSession.isPending}
          title="Edit session"
        />
      )}

      {/* Add Exercise */}
      {addExerciseSheet && (
        <ExerciseSheet
          open={!!addExerciseSheet}
          onClose={() => setAddExerciseSheet(null)}
          onSubmit={(vals) => addExercise.mutate({ sessionId: addExerciseSheet, vals })}
          loading={addExercise.isPending}
          title="Add exercise"
        />
      )}

      {/* Edit Exercise */}
      {editExerciseSheet && (
        <ExerciseSheet
          open={!!editExerciseSheet}
          onClose={() => setEditExerciseSheet(null)}
          defaultValues={{
            name: editExerciseSheet.name,
            default_sets: editExerciseSheet.default_sets,
            rep_range_min: editExerciseSheet.rep_range_min ?? undefined,
            rep_range_max: editExerciseSheet.rep_range_max ?? undefined,
            rest_seconds: editExerciseSheet.rest_seconds ?? undefined,
            effort_notes: editExerciseSheet.effort_notes ?? '',
            form_notes: editExerciseSheet.form_notes ?? '',
            youtube_url: editExerciseSheet.youtube_url ?? '',
            replaces_exercise: editExerciseSheet.replaces_exercise ?? '',
            is_superset: editExerciseSheet.is_superset,
            superset_group: editExerciseSheet.superset_group ?? '',
          }}
          onSubmit={(vals) => updateExercise.mutate({ id: editExerciseSheet.id, vals })}
          loading={updateExercise.isPending}
          title="Edit exercise"
        />
      )}

      {/* Delete confirm */}
      <BottomSheet
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm delete"
      >
        <p className="body" style={{ color: 'var(--text-2)', marginBottom: '20px' }}>
          Are you sure you want to delete this {deleteConfirm?.type}? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setDeleteConfirm(null)}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: '12px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!deleteConfirm) return
              if (deleteConfirm.type === 'session') deleteSession.mutate(deleteConfirm.id)
              else deleteExercise.mutate(deleteConfirm.id)
              setDeleteConfirm(null)
            }}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: '12px',
              background: 'var(--red)',
              border: 'none',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

// ---- Sheet Forms ----

function ProgrammeSheet({
  open,
  onClose,
  defaultValues,
  onSubmit,
  loading,
}: {
  open: boolean
  onClose: () => void
  defaultValues?: ProgrammeForm
  onSubmit: (vals: ProgrammeForm) => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProgrammeForm>({
    resolver: zodResolver(programmeSchema),
    defaultValues,
  })

  const submit: SubmitHandler<ProgrammeForm> = (vals) => {
    onSubmit(vals)
    reset()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Edit programme">
      <form onSubmit={handleSubmit(submit)}>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Name</label>
          <input {...register('name')} style={inputStyle} />
          {errors.name && <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>{errors.name.message}</p>}
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Description (optional)</label>
          <textarea {...register('description')} rows={3} style={{ ...inputStyle, resize: 'none' }} />
        </div>
        <SubmitBtn loading={loading}>Save changes</SubmitBtn>
      </form>
    </BottomSheet>
  )
}

function SessionSheet({
  open,
  onClose,
  defaultValues,
  onSubmit,
  loading,
  title,
}: {
  open: boolean
  onClose: () => void
  defaultValues?: SessionForm
  onSubmit: (vals: SessionForm) => void
  loading: boolean
  title: string
}) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: defaultValues ?? { category: 'upper' },
  })

  const submit: SubmitHandler<SessionForm> = (vals) => {
    onSubmit(vals)
    reset()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(submit)}>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Session name</label>
          <input {...register('name')} style={inputStyle} placeholder="e.g. Upper Body A" />
          {errors.name && <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>{errors.name.message}</p>}
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Category</label>
          <select {...register('category')} style={inputStyle}>
            <option value="upper">Upper</option>
            <option value="lower">Lower</option>
            <option value="full">Full Body</option>
            <option value="cardio">Cardio</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Day hint (optional)</label>
          <input {...register('day_hint')} style={inputStyle} placeholder="e.g. Monday" />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Notes (optional)</label>
          <textarea {...register('notes')} rows={2} style={{ ...inputStyle, resize: 'none' }} />
        </div>
        <SubmitBtn loading={loading}>Save</SubmitBtn>
      </form>
    </BottomSheet>
  )
}

function ExerciseSheet({
  open,
  onClose,
  defaultValues,
  onSubmit,
  loading,
  title,
}: {
  open: boolean
  onClose: () => void
  defaultValues?: ExerciseForm
  onSubmit: (vals: ExerciseForm) => void
  loading: boolean
  title: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ExerciseForm>({
    resolver: zodResolver(exerciseSchema) as any,
    defaultValues: defaultValues ?? { default_sets: 3, is_superset: false },
  })

  const submit = (vals: ExerciseForm) => {
    onSubmit(vals)
    reset()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit(submit as any)}>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
          <div>
            <label style={labelStyle}>Exercise name</label>
            <input {...register('name')} style={inputStyle} />
            {errors.name && <p className="caption" style={{ color: 'var(--red)', marginTop: '4px' }}>{errors.name.message}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Sets</label>
              <input type="number" inputMode="numeric" {...register('default_sets')} style={inputStyle} min={1} />
            </div>
            <div>
              <label style={labelStyle}>Reps min</label>
              <input type="number" inputMode="numeric" {...register('rep_range_min')} style={inputStyle} min={1} />
            </div>
            <div>
              <label style={labelStyle}>Reps max</label>
              <input type="number" inputMode="numeric" {...register('rep_range_max')} style={inputStyle} min={1} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Rest (seconds)</label>
            <input type="number" inputMode="numeric" {...register('rest_seconds')} style={inputStyle} min={0} />
          </div>

          <div>
            <label style={labelStyle}>Effort notes</label>
            <input {...register('effort_notes')} style={inputStyle} placeholder="e.g. Shy, Shy, To failure" />
          </div>

          <div>
            <label style={labelStyle}>Form notes</label>
            <textarea {...register('form_notes')} rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>

          <div>
            <label style={labelStyle}>YouTube URL</label>
            <input type="url" {...register('youtube_url')} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Replaces exercise (optional)</label>
            <input {...register('replaces_exercise')} style={inputStyle} placeholder="e.g. Cable Fly" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Superset group</label>
              <input {...register('superset_group')} style={inputStyle} placeholder="e.g. A" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" {...register('is_superset')} style={{ width: '16px', height: '16px' }} />
                Is superset
              </label>
            </div>
          </div>
        </div>
        <SubmitBtn loading={loading}>Save</SubmitBtn>
      </form>
    </BottomSheet>
  )
}

function SubmitBtn({ children, loading }: { children: ReactNode; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%',
        padding: '13px',
        borderRadius: '12px',
        background: 'var(--blue)',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 600,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? 'Saving…' : children}
    </button>
  )
}
