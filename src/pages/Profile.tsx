import { useState, type CSSProperties } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Check, X, Trash2, Plus, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { UserAvatar } from '../components/UserAvatar'
import { BottomSheet } from '../components/BottomSheet'
import type { Profile as ProfileType, Programme } from '../lib/types'

const inputStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-1)',
  fontSize: '15px',
  width: '100%',
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const [editingName, setEditingName] = useState(false)
  const [editingWeight, setEditingWeight] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [signOutConfirm, setSignOutConfirm] = useState(false)
  const [deleteProgConfirm, setDeleteProgConfirm] = useState<string | null>(null)
  const [newProgSheet, setNewProgSheet] = useState(false)
  const [editProgSheet, setEditProgSheet] = useState<Programme | null>(null)
  const [newProgName, setNewProgName] = useState('')
  const [editProgName, setEditProgName] = useState('')

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data as ProfileType
    },
    enabled: !!user,
  })

  const { data: programmes = [] } = useQuery({
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

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<ProfileType>) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const createProgramme = useMutation({
    mutationFn: async (name: string) => {
      await supabase.from('programmes').update({ is_active: false }).eq('user_id', user!.id)
      const { error } = await supabase.from('programmes').insert({
        name,
        user_id: user!.id,
        is_active: true,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
      setNewProgSheet(false)
      setNewProgName('')
      showToast('Programme created')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const updateProgramme = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('programmes')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
      setEditProgSheet(null)
      showToast('Programme updated')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const deleteProgramme = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('programmes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
      setDeleteProgConfirm(null)
      showToast('Programme deleted')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const activateProgramme = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('programmes').update({ is_active: false }).eq('user_id', user!.id)
      await supabase.from('programmes').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programmes', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['active-programme', user?.id] })
    },
  })

  async function exportData() {
    if (!user) return
    const [{ data: profileData }, { data: progs }, { data: sess }, { data: exs }, { data: ls }, { data: lsets }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id),
      supabase.from('programmes').select('*').eq('user_id', user.id),
      supabase.from('workout_sessions').select('*').eq('user_id', user.id),
      supabase.from('exercises').select('*').eq('user_id', user.id),
      supabase.from('logged_sessions').select('*').eq('user_id', user.id),
      supabase.from('logged_sets').select('*').eq('user_id', user.id),
    ])
    const blob = new Blob([JSON.stringify({ profile: profileData, programmes: progs, sessions: sess, exercises: exs, logged_sessions: ls, logged_sets: lsets }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gymplan-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Data exported!')
  }

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'User'

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      paddingTop: 'calc(16px + env(safe-area-inset-top))',
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 24px)',
    }}>
      <div style={{ padding: '0 16px' }}>
        <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '20px' }}>Profile</h1>

        {/* Avatar + name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: 'var(--surface-1)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          border: '1px solid var(--border)',
        }}>
          <UserAvatar name={profile?.display_name} email={user?.email} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: '15px' }}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      updateProfile.mutate({ display_name: nameInput || null })
                      setEditingName(false)
                      showToast('Name updated')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    updateProfile.mutate({ display_name: nameInput || null })
                    setEditingName(false)
                    showToast('Name updated')
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: '4px' }}
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p className="body-strong" style={{ color: 'var(--text-1)' }}>{displayName}</p>
                <button
                  onClick={() => { setEditingName(true); setNameInput(profile?.display_name ?? '') }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px' }}
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>{user?.email}</p>
          </div>
        </div>

        {/* Body weight */}
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '16px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <p className="caption" style={{ color: 'var(--text-2)' }}>Body weight</p>
            {editingWeight ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: '15px', width: '100px' }}
                  autoFocus
                  step={0.5}
                  min={30}
                />
                <span className="caption" style={{ color: 'var(--text-2)' }}>kg</span>
                <button
                  onClick={() => {
                    const w = parseFloat(weightInput)
                    if (!isNaN(w) && w > 0) {
                      updateProfile.mutate({ body_weight_kg: w })
                      setEditingWeight(false)
                      showToast('Body weight updated')
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: '4px' }}
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setEditingWeight(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <p className="body-strong" style={{ color: 'var(--text-1)', marginTop: '2px' }}>
                {profile?.body_weight_kg != null ? `${profile.body_weight_kg} kg` : 'Not set'}
              </p>
            )}
          </div>
          {!editingWeight && (
            <button
              onClick={() => { setEditingWeight(true); setWeightInput(profile?.body_weight_kg?.toString() ?? '') }}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
            >
              <Pencil size={16} />
            </button>
          )}
        </div>

        {/* Programmes */}
        <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Programmes</p>
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          {programmes.map((prog, idx) => (
            <div
              key={prog.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '13px 14px',
                borderBottom: idx < programmes.length - 1 ? '1px solid var(--border)' : 'none',
                gap: '10px',
              }}
            >
              <button
                onClick={() => !prog.is_active && activateProgramme.mutate(prog.id)}
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${prog.is_active ? 'var(--blue)' : 'var(--border)'}`,
                  background: prog.is_active ? 'var(--blue)' : 'transparent',
                  cursor: prog.is_active ? 'default' : 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {prog.is_active && <Check size={12} color="#fff" />}
              </button>
              <p className="body" style={{ color: 'var(--text-1)', flex: 1 }}>{prog.name}</p>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => { setEditProgSheet(prog); setEditProgName(prog.name) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setDeleteProgConfirm(prog.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setNewProgSheet(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '13px 14px',
              background: 'none',
              border: 'none',
              color: 'var(--blue)',
              fontSize: '15px',
              cursor: 'pointer',
              width: '100%',
              borderTop: programmes.length > 0 ? '1px solid var(--border)' : 'none',
            }}
          >
            <Plus size={16} />
            New programme
          </button>
        </div>

        {/* Data */}
        <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Data</p>
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: '24px',
        }}>
          <button
            onClick={exportData}
            style={{
              display: 'block',
              width: '100%',
              padding: '14px',
              background: 'none',
              border: 'none',
              color: 'var(--blue)',
              fontSize: '15px',
              cursor: 'pointer',
              textAlign: 'left',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Export all data (JSON)
          </button>
          <label
            style={{
              display: 'block',
              padding: '14px',
              color: 'var(--blue)',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Import backup
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const data = JSON.parse(text)
                  console.log('Import data:', data)
                  showToast('Import coming soon!')
                } catch {
                  showToast('Invalid file format')
                }
              }}
            />
          </label>
        </div>

        {/* Sign out */}
        <button
          onClick={() => setSignOutConfirm(true)}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: 'var(--red-dim)',
            border: '1px solid var(--border)',
            color: 'var(--red)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>

      {/* New programme sheet */}
      <BottomSheet open={newProgSheet} onClose={() => setNewProgSheet(false)} title="New programme">
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px' }}>
            Programme name
          </label>
          <input
            value={newProgName}
            onChange={e => setNewProgName(e.target.value)}
            style={inputStyle}
            placeholder="e.g. Push Pull Legs"
            autoFocus
          />
        </div>
        <button
          onClick={() => { if (newProgName.trim()) createProgramme.mutate(newProgName.trim()) }}
          disabled={!newProgName.trim() || createProgramme.isPending}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '12px',
            background: 'var(--blue)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 600,
            border: 'none',
            cursor: !newProgName.trim() || createProgramme.isPending ? 'not-allowed' : 'pointer',
            opacity: !newProgName.trim() || createProgramme.isPending ? 0.6 : 1,
          }}
        >
          {createProgramme.isPending ? 'Creating…' : 'Create programme'}
        </button>
      </BottomSheet>

      {/* Edit programme sheet */}
      {editProgSheet && (
        <BottomSheet open={!!editProgSheet} onClose={() => setEditProgSheet(null)} title="Edit programme">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '6px' }}>
              Programme name
            </label>
            <input
              value={editProgName}
              onChange={e => setEditProgName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>
          <button
            onClick={() => {
              if (editProgName.trim() && editProgSheet) {
                updateProgramme.mutate({ id: editProgSheet.id, name: editProgName.trim() })
              }
            }}
            disabled={!editProgName.trim() || updateProgramme.isPending}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              background: 'var(--blue)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              border: 'none',
              cursor: !editProgName.trim() || updateProgramme.isPending ? 'not-allowed' : 'pointer',
              opacity: !editProgName.trim() || updateProgramme.isPending ? 0.6 : 1,
            }}
          >
            {updateProgramme.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </BottomSheet>
      )}

      {/* Delete programme confirm */}
      <BottomSheet open={!!deleteProgConfirm} onClose={() => setDeleteProgConfirm(null)} title="Delete programme?">
        <p className="body" style={{ color: 'var(--text-2)', marginBottom: '20px' }}>
          This will permanently delete this programme and all its sessions and exercises.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setDeleteProgConfirm(null)}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-1)', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (deleteProgConfirm) deleteProgramme.mutate(deleteProgConfirm) }}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              background: 'var(--red)', border: 'none',
              color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </BottomSheet>

      {/* Sign out confirm */}
      <BottomSheet open={signOutConfirm} onClose={() => setSignOutConfirm(false)} title="Sign out?">
        <p className="body" style={{ color: 'var(--text-2)', marginBottom: '20px' }}>
          Are you sure you want to sign out?
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSignOutConfirm(false)}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              color: 'var(--text-1)', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={signOut}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              background: 'var(--red)', border: 'none',
              color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
