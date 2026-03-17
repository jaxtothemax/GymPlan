import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Profile } from '../lib/types'

const MEAL_DATA = [
  {
    name: 'Breakfast',
    targetProtein: 50,
    time: '~7:30am',
    items: [
      { name: '4 whole eggs', protein: 24, calories: 280 },
      { name: '200ml semi-skimmed milk', protein: 7, calories: 90 },
      { name: '40g oats (dry)', protein: 5, calories: 150 },
      { name: '1 scoop whey protein', protein: 25, calories: 110 },
      { name: 'Banana', protein: 1, calories: 90 },
    ],
  },
  {
    name: 'Lunch',
    targetProtein: 55,
    time: '~12:30pm',
    items: [
      { name: '200g chicken breast', protein: 44, calories: 220 },
      { name: '200g cooked rice', protein: 4, calories: 260 },
      { name: 'Large mixed salad', protein: 2, calories: 40 },
      { name: '1 tbsp olive oil', protein: 0, calories: 120 },
      { name: '150g Greek yogurt', protein: 15, calories: 90 },
    ],
  },
  {
    name: 'Dinner',
    targetProtein: 50,
    time: '~6:30pm',
    items: [
      { name: '250g lean beef mince (5%)', protein: 52, calories: 340 },
      { name: '200g sweet potato', protein: 3, calories: 170 },
      { name: 'Broccoli 200g', protein: 6, calories: 68 },
      { name: '100g cottage cheese', protein: 12, calories: 80 },
    ],
  },
]

const PROTEIN_SOURCES = [
  { name: 'Chicken breast (100g)', protein: 31 },
  { name: 'Lean beef mince 5% (100g)', protein: 26 },
  { name: 'Salmon fillet (100g)', protein: 25 },
  { name: 'Eggs (1 whole)', protein: 6 },
  { name: 'Greek yogurt (100g)', protein: 10 },
  { name: 'Cottage cheese (100g)', protein: 12 },
  { name: 'Whey protein (1 scoop)', protein: 25 },
  { name: 'Milk semi-skimmed (200ml)', protein: 7 },
  { name: 'Tuna (100g drained)', protein: 25 },
  { name: 'Tofu firm (100g)', protein: 8 },
]

export default function Nutrition() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(new Set([0]))
  const [editingWeight, setEditingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState('')

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!user,
  })

  const updateWeight = useMutation({
    mutationFn: async (weight: number) => {
      const { error } = await supabase
        .from('profiles')
        .update({ body_weight_kg: weight })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      setEditingWeight(false)
      showToast('Body weight updated')
    },
    onError: () => showToast('Could not save — check your connection'),
  })

  const bodyWeight = profile?.body_weight_kg ?? 80
  const proteinTarget = Math.round(bodyWeight * 2)
  const totalProtein = MEAL_DATA.reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.protein, 0), 0)
  const totalCalories = MEAL_DATA.reduce((sum, m) => sum + m.items.reduce((s, i) => s + i.calories, 0), 0)

  function toggleMeal(idx: number) {
    setExpandedMeals(prev => {
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
        <h1 className="title-lg" style={{ color: 'var(--text-1)', marginBottom: '16px' }}>Nutrition</h1>

        {/* Macro targets row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {/* Protein card */}
          <button
            onClick={() => {
              setEditingWeight(true)
              setWeightInput(bodyWeight.toString())
            }}
            style={{
              background: 'var(--blue-dim)',
              borderRadius: '14px',
              padding: '12px',
              border: '1px solid var(--border)',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <p className="label" style={{ color: 'var(--blue)', marginBottom: '4px' }}>Protein</p>
            {editingWeight ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  style={{
                    width: '60px',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-1)',
                    color: 'var(--text-1)',
                    fontSize: '13px',
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    const w = parseFloat(weightInput)
                    if (!isNaN(w) && w > 0) updateWeight.mutate(w)
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', padding: '2px' }}
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => setEditingWeight(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '2px', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <p className="title" style={{ color: 'var(--blue)' }}>{proteinTarget}g</p>
                <p style={{ fontSize: '11px', color: 'var(--blue)', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                  {bodyWeight}kg <Pencil size={10} />
                </p>
              </>
            )}
          </button>

          {/* Surplus card */}
          <div style={{
            background: 'var(--green-dim)',
            borderRadius: '14px',
            padding: '12px',
            border: '1px solid var(--border)',
          }}>
            <p className="label" style={{ color: 'var(--green)', marginBottom: '4px' }}>Surplus</p>
            <p className="title" style={{ color: 'var(--green)' }}>+250</p>
            <p style={{ fontSize: '11px', color: 'var(--green)', opacity: 0.7, marginTop: '2px' }}>kcal/day</p>
          </div>

          {/* Meals card */}
          <div style={{
            background: 'var(--amber-dim)',
            borderRadius: '14px',
            padding: '12px',
            border: '1px solid var(--border)',
          }}>
            <p className="label" style={{ color: 'var(--amber)', marginBottom: '4px' }}>Meals</p>
            <p className="title" style={{ color: 'var(--amber)' }}>3–4</p>
            <p style={{ fontSize: '11px', color: 'var(--amber)', opacity: 0.7, marginTop: '2px' }}>per day</p>
          </div>
        </div>

        {/* Daily totals */}
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '16px',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <div>
            <p className="caption" style={{ color: 'var(--text-2)' }}>Plan protein</p>
            <p className="body-strong" style={{ color: 'var(--text-1)' }}>{totalProtein}g</p>
          </div>
          <div style={{ height: '36px', width: '1px', background: 'var(--border)' }} />
          <div>
            <p className="caption" style={{ color: 'var(--text-2)' }}>Plan calories</p>
            <p className="body-strong" style={{ color: 'var(--text-1)' }}>~{totalCalories} kcal</p>
          </div>
          <div style={{ height: '36px', width: '1px', background: 'var(--border)' }} />
          <div>
            <p className="caption" style={{ color: 'var(--text-2)' }}>Target</p>
            <p className="body-strong" style={{ color: proteinTarget <= totalProtein ? 'var(--green)' : 'var(--amber)' }}>
              {proteinTarget}g
            </p>
          </div>
        </div>

        {/* Meal plan accordions */}
        <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Meal plan</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {MEAL_DATA.map((meal, idx) => {
            const mealProtein = meal.items.reduce((sum, i) => sum + i.protein, 0)
            const mealCalories = meal.items.reduce((sum, i) => sum + i.calories, 0)
            const isExpanded = expandedMeals.has(idx)

            return (
              <div
                key={meal.name}
                style={{
                  background: 'var(--surface-1)',
                  borderRadius: '14px',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                }}
              >
                <div
                  onClick={() => toggleMeal(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '14px',
                    cursor: 'pointer',
                    gap: '10px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p className="body-strong" style={{ color: 'var(--text-1)' }}>{meal.name}</p>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{meal.time}</span>
                    </div>
                    <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                      {mealProtein}g protein · {mealCalories} kcal
                    </p>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: 'var(--blue-dim)',
                    color: 'var(--blue)',
                    fontWeight: 600,
                  }}>
                    ~{meal.targetProtein}g P
                  </span>
                  <div style={{ color: 'var(--text-3)' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                <div
                  className="accordion-body"
                  style={{ maxHeight: isExpanded ? '1000px' : '0' }}
                >
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {meal.items.map((item, i) => (
                      <div
                        key={item.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: i < meal.items.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p className="body" style={{ color: 'var(--text-1)' }}>{item.name}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600 }}>{item.protein}g P</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{item.calories} kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Protein sources */}
        <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Protein sources</p>
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {PROTEIN_SOURCES.map((source, i) => (
            <div
              key={source.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '11px 14px',
                borderBottom: i < PROTEIN_SOURCES.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <p className="body" style={{ color: 'var(--text-1)', flex: 1 }}>{source.name}</p>
              <span style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600 }}>{source.protein}g</span>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="note-box info" style={{ marginBottom: '12px' }}>
          <p className="body-strong" style={{ marginBottom: '4px' }}>Calorie surplus for muscle gain</p>
          <p className="caption" style={{ color: 'var(--text-2)' }}>
            A modest surplus of 200–300 kcal/day above maintenance is optimal for lean muscle gain.
            Too large a surplus leads to excess fat gain.
          </p>
        </div>

        <div className="note-box warning">
          <p className="body-strong" style={{ marginBottom: '4px' }}>Protein timing</p>
          <p className="caption" style={{ color: 'inherit', opacity: 0.9 }}>
            Space protein intake across 3–4 meals (30–50g per meal) for optimal muscle protein synthesis.
          </p>
        </div>
      </div>
    </div>
  )
}
