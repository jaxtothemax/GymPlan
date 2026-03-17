import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Pencil, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import type { Profile } from '../lib/types'

// ── Dietary restriction types ─────────────────────────────────────────────────

type Diet = 'vegan' | 'vegetarian' | 'pescatarian' | 'dairy-free' | 'gluten-free' | 'no-powders'
type FoodTag = 'meat' | 'poultry' | 'fish' | 'dairy' | 'egg' | 'gluten' | 'powder'

interface FoodItem {
  name: string
  protein: number
  calories: number
  tags: FoodTag[]
  // Substitutes keyed by the restriction that makes this item non-compliant.
  // null = remove item entirely. object = replace with this.
  subs?: Partial<Record<Diet, { name: string; protein: number; calories: number } | null>>
}

interface Meal {
  name: string
  time: string
  targetProtein: number
  items: FoodItem[]
}

// ── Tags that each diet excludes ──────────────────────────────────────────────

const DIET_EXCLUDES: Record<Diet, FoodTag[]> = {
  vegan:         ['meat', 'poultry', 'fish', 'dairy', 'egg'],
  vegetarian:    ['meat', 'poultry', 'fish'],
  pescatarian:   ['meat', 'poultry'],
  'dairy-free':  ['dairy'],
  'gluten-free': ['gluten'],
  'no-powders':  ['powder'],
}

const DIET_LABELS: Record<Diet, string> = {
  vegan:         'Vegan',
  vegetarian:    'Vegetarian',
  pescatarian:   'Pescatarian',
  'dairy-free':  'No Dairy',
  'gluten-free': 'Gluten-Free',
  'no-powders':  'No Powders',
}

// Diets that imply each other — if vegan is on, dairy-free is automatically satisfied
const DIET_IMPLIES: Partial<Record<Diet, Diet[]>> = {
  vegan: ['vegetarian', 'dairy-free'],
}

// ── Meal data with tags + substitutions ───────────────────────────────────────

const MEAL_DATA: Meal[] = [
  {
    name: 'Breakfast',
    targetProtein: 50,
    time: '~7:30am',
    items: [
      {
        name: '4 whole eggs',
        protein: 24, calories: 280,
        tags: ['egg'],
        subs: {
          vegan: { name: '200g silken tofu scrambled', protein: 18, calories: 180 },
        },
      },
      {
        name: '200ml semi-skimmed milk',
        protein: 7, calories: 90,
        tags: ['dairy'],
        subs: {
          vegan: { name: '200ml oat milk', protein: 2, calories: 80 },
          'dairy-free': { name: '200ml oat milk', protein: 2, calories: 80 },
        },
      },
      {
        name: '40g oats (dry)',
        protein: 5, calories: 150,
        tags: ['gluten'],
        subs: {
          'gluten-free': { name: '40g buckwheat flakes', protein: 5, calories: 140 },
        },
      },
      {
        name: '1 scoop whey protein',
        protein: 25, calories: 110,
        tags: ['dairy', 'powder'],
        subs: {
          vegan:        { name: '1 scoop pea protein powder', protein: 21, calories: 100 },
          'dairy-free': { name: '1 scoop pea protein powder', protein: 21, calories: 100 },
          'no-powders': { name: '200g cottage cheese', protein: 22, calories: 180 },
        },
      },
      {
        name: 'Banana',
        protein: 1, calories: 90,
        tags: [],
      },
    ],
  },
  {
    name: 'Lunch',
    targetProtein: 55,
    time: '~12:30pm',
    items: [
      {
        name: '200g chicken breast',
        protein: 44, calories: 220,
        tags: ['poultry'],
        subs: {
          vegan:       { name: '200g firm tofu', protein: 18, calories: 160 },
          vegetarian:  { name: '200g firm tofu', protein: 18, calories: 160 },
          pescatarian: { name: '200g salmon fillet', protein: 40, calories: 280 },
        },
      },
      {
        name: '200g cooked rice',
        protein: 4, calories: 260,
        tags: [],
      },
      {
        name: 'Large mixed salad',
        protein: 2, calories: 40,
        tags: [],
      },
      {
        name: '1 tbsp olive oil',
        protein: 0, calories: 120,
        tags: [],
      },
      {
        name: '150g Greek yogurt',
        protein: 15, calories: 90,
        tags: ['dairy'],
        subs: {
          vegan:       { name: '150g soy yogurt', protein: 8, calories: 85 },
          'dairy-free':{ name: '150g coconut yogurt', protein: 2, calories: 95 },
        },
      },
    ],
  },
  {
    name: 'Dinner',
    targetProtein: 50,
    time: '~6:30pm',
    items: [
      {
        name: '250g lean beef mince (5%)',
        protein: 52, calories: 340,
        tags: ['meat'],
        subs: {
          vegan:       { name: '250g tempeh', protein: 47, calories: 400 },
          vegetarian:  { name: '250g tempeh', protein: 47, calories: 400 },
          pescatarian: { name: '250g salmon fillet', protein: 50, calories: 350 },
        },
      },
      {
        name: '200g sweet potato',
        protein: 3, calories: 170,
        tags: [],
      },
      {
        name: 'Broccoli 200g',
        protein: 6, calories: 68,
        tags: [],
      },
      {
        name: '100g cottage cheese',
        protein: 12, calories: 80,
        tags: ['dairy'],
        subs: {
          vegan:       { name: '100g firm tofu', protein: 8, calories: 80 },
          'dairy-free':{ name: '100g firm tofu', protein: 8, calories: 80 },
        },
      },
    ],
  },
]

interface ProteinSource {
  name: string
  protein: number
  tags: FoodTag[]
}

const PROTEIN_SOURCES: ProteinSource[] = [
  { name: 'Chicken breast (100g)',    protein: 31, tags: ['poultry'] },
  { name: 'Lean beef mince 5% (100g)',protein: 26, tags: ['meat']   },
  { name: 'Salmon fillet (100g)',     protein: 25, tags: ['fish']   },
  { name: 'Tuna (100g drained)',      protein: 25, tags: ['fish']   },
  { name: 'Eggs (1 whole)',           protein: 6,  tags: ['egg']    },
  { name: 'Greek yogurt (100g)',      protein: 10, tags: ['dairy']  },
  { name: 'Cottage cheese (100g)',    protein: 12, tags: ['dairy']  },
  { name: 'Whey protein (1 scoop)',   protein: 25, tags: ['dairy', 'powder']  },
  { name: 'Milk semi-skimmed (200ml)',protein: 7,  tags: ['dairy']  },
  { name: 'Tofu firm (100g)',         protein: 8,  tags: []         },
  { name: 'Tempeh (100g)',            protein: 19, tags: []         },
  { name: 'Edamame (100g)',           protein: 11, tags: []         },
  { name: 'Pea protein (1 scoop)',    protein: 21, tags: ['powder'] },
  { name: 'Lentils cooked (100g)',    protein: 9,  tags: []         },
  { name: 'Chickpeas (100g)',         protein: 9,  tags: []         },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the effective set of excluded tags given active diets */
function getExcludedTags(diets: Set<Diet>): Set<FoodTag> {
  const tags = new Set<FoodTag>()
  diets.forEach(d => DIET_EXCLUDES[d].forEach(t => tags.add(t)))
  return tags
}

/** Returns the best substitute for an item given active diets, or null to remove */
function getSubstitute(
  item: FoodItem,
  diets: Set<Diet>,
): { name: string; protein: number; calories: number } | null | undefined {
  // undefined = item is fine (no substitution needed)
  const excluded = getExcludedTags(diets)
  const violated = item.tags.some(t => excluded.has(t))
  if (!violated) return undefined

  if (!item.subs) return null // no substitute defined — remove

  // Find the best substitute: prefer the most specific diet match
  const priority: Diet[] = ['vegan', 'vegetarian', 'pescatarian', 'dairy-free', 'gluten-free', 'no-powders']
  for (const diet of priority) {
    if (diets.has(diet) && diet in item.subs) {
      return item.subs[diet] // may be null (intentional removal)
    }
  }
  return null // no matching sub — remove
}

/** Resolve a meal's items against active dietary restrictions */
function resolveMealItems(
  items: FoodItem[],
  diets: Set<Diet>,
): Array<{ item: FoodItem; resolved: { name: string; protein: number; calories: number }; substituted: boolean }> {
  if (diets.size === 0) {
    return items.map(item => ({ item, resolved: item, substituted: false }))
  }
  const result = []
  for (const item of items) {
    const sub = getSubstitute(item, diets)
    if (sub === undefined) {
      result.push({ item, resolved: item, substituted: false })
    } else if (sub === null) {
      // removed — skip
    } else {
      result.push({ item, resolved: sub, substituted: true })
    }
  }
  return result
}

const STORAGE_KEY = 'gymplan_dietary_restrictions'

// ── Component ─────────────────────────────────────────────────────────────────

export default function Nutrition() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [expandedMeals, setExpandedMeals] = useState<Set<number>>(new Set([0]))
  const [dietOpen, setDietOpen] = useState(false)
  const [editingWeight, setEditingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState('')

  const [activeDiets, setActiveDiets] = useState<Set<Diet>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? new Set(JSON.parse(saved) as Diet[]) : new Set()
    } catch { return new Set() }
  })

  // Persist to localStorage whenever diets change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...activeDiets]))
  }, [activeDiets])

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

  function toggleDiet(diet: Diet) {
    setActiveDiets(prev => {
      const next = new Set(prev)
      if (next.has(diet)) {
        next.delete(diet)
      } else {
        // If adding vegan, also remove redundant sub-restrictions (they're implied)
        next.add(diet)
        const implied = DIET_IMPLIES[diet] ?? []
        implied.forEach(d => next.delete(d))
      }
      return next
    })
  }

  function toggleMeal(idx: number) {
    setExpandedMeals(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const bodyWeight = profile?.body_weight_kg ?? 80
  const proteinTarget = Math.round(bodyWeight * 2)

  // Resolve all meals against active diets
  const resolvedMeals = MEAL_DATA.map(meal => {
    const resolvedItems = resolveMealItems(meal.items, activeDiets)
    const totalProtein = resolvedItems.reduce((s, r) => s + r.resolved.protein, 0)
    const totalCalories = resolvedItems.reduce((s, r) => s + r.resolved.calories, 0)
    return { ...meal, resolvedItems, totalProtein, totalCalories }
  })

  const planProtein = resolvedMeals.reduce((s, m) => s + m.totalProtein, 0)
  const planCalories = resolvedMeals.reduce((s, m) => s + m.totalCalories, 0)

  // Filter protein sources
  const excluded = getExcludedTags(activeDiets)
  const filteredSources = PROTEIN_SOURCES.filter(s => !s.tags.some(t => excluded.has(t)))

  // Which diet pills to show — if vegan is on, grey out/hide implied ones
  const impliedByActive = new Set<Diet>()
  activeDiets.forEach(d => {
    ;(DIET_IMPLIES[d] ?? []).forEach(i => impliedByActive.add(i))
  })

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

        {/* ── Dietary restrictions accordion ── */}
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          <button
            onClick={() => setDietOpen(o => !o)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: '10px',
            }}
          >
            <div style={{ flex: 1, textAlign: 'left' }}>
              <p className="body-strong" style={{ color: 'var(--text-1)' }}>Dietary restrictions</p>
              {activeDiets.size > 0 ? (
                <p className="caption" style={{ color: 'var(--blue)', marginTop: '2px' }}>
                  {[...activeDiets].map(d => DIET_LABELS[d]).join(', ')}
                </p>
              ) : (
                <p className="caption" style={{ color: 'var(--text-3)', marginTop: '2px' }}>None selected</p>
              )}
            </div>
            <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>
              {dietOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <div className="accordion-body" style={{ maxHeight: dietOpen ? '400px' : '0' }}>
            <div style={{ borderTop: '1px solid var(--border)', padding: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(Object.keys(DIET_LABELS) as Diet[]).map(diet => {
                  const isActive = activeDiets.has(diet)
                  const isImplied = impliedByActive.has(diet)
                  return (
                    <button
                      key={diet}
                      onClick={() => !isImplied && toggleDiet(diet)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '100px',
                        border: `1.5px solid ${isActive || isImplied ? 'var(--blue)' : 'var(--border)'}`,
                        background: isActive || isImplied ? 'var(--blue-dim)' : 'var(--surface-2)',
                        color: isActive || isImplied ? 'var(--blue)' : 'var(--text-2)',
                        fontSize: '14px',
                        fontWeight: isActive || isImplied ? 600 : 400,
                        cursor: isImplied ? 'default' : 'pointer',
                        opacity: isImplied ? 0.5 : 1,
                        transition: 'all 150ms ease',
                        minHeight: '44px',
                      }}
                    >
                      {isImplied ? `${DIET_LABELS[diet]} ✓` : DIET_LABELS[diet]}
                    </button>
                  )
                })}
              </div>
              {activeDiets.size > 0 && (
                <button
                  onClick={() => setActiveDiets(new Set())}
                  style={{
                    marginTop: '12px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-3)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Macro targets row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {/* Protein card */}
          <button
            onClick={() => { setEditingWeight(true); setWeightInput(bodyWeight.toString()) }}
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
                    fontSize: '16px',
                  }}
                  autoFocus
                />
                <button
                  onClick={() => { const w = parseFloat(weightInput); if (!isNaN(w) && w > 0) updateWeight.mutate(w) }}
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
          <div style={{ background: 'var(--green-dim)', borderRadius: '14px', padding: '12px', border: '1px solid var(--border)' }}>
            <p className="label" style={{ color: 'var(--green)', marginBottom: '4px' }}>Surplus</p>
            <p className="title" style={{ color: 'var(--green)' }}>+250</p>
            <p style={{ fontSize: '11px', color: 'var(--green)', opacity: 0.7, marginTop: '2px' }}>kcal/day</p>
          </div>

          {/* Meals card */}
          <div style={{ background: 'var(--amber-dim)', borderRadius: '14px', padding: '12px', border: '1px solid var(--border)' }}>
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
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr auto 1fr',
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '4px' }}>Plan protein</p>
            <p className="body-strong" style={{ color: 'var(--text-1)' }}>{planProtein}g</p>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border)', margin: '0 12px' }} />
          <div style={{ textAlign: 'center' }}>
            <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '4px' }}>Plan calories</p>
            <p className="body-strong" style={{ color: 'var(--text-1)' }}>~{planCalories} kcal</p>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border)', margin: '0 12px' }} />
          <div style={{ textAlign: 'center' }}>
            <p className="caption" style={{ color: 'var(--text-2)', marginBottom: '4px' }}>Target</p>
            <p className="body-strong" style={{ color: proteinTarget <= planProtein ? 'var(--green)' : 'var(--amber)' }}>
              {proteinTarget}g
            </p>
          </div>
        </div>

        {/* ── Meal plan accordions ── */}
        <p className="body-strong" style={{ color: 'var(--text-1)', marginBottom: '10px' }}>Meal plan</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {resolvedMeals.map((meal, idx) => {
            const isExpanded = expandedMeals.has(idx)
            const hasSubstitutions = meal.resolvedItems.some(r => r.substituted)

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
                  style={{ display: 'flex', alignItems: 'center', padding: '14px', cursor: 'pointer', gap: '10px' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p className="body-strong" style={{ color: 'var(--text-1)' }}>{meal.name}</p>
                      <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{meal.time}</span>
                      {hasSubstitutions && (
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '100px',
                          background: 'var(--green-dim)',
                          color: 'var(--green)',
                          fontWeight: 600,
                        }}>
                          adapted
                        </span>
                      )}
                    </div>
                    <p className="caption" style={{ color: 'var(--text-2)', marginTop: '2px' }}>
                      {meal.totalProtein}g protein · {meal.totalCalories} kcal
                    </p>
                  </div>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: 'var(--blue-dim)',
                    color: 'var(--blue)',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}>
                    ~{meal.targetProtein}g P
                  </span>
                  <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                <div className="accordion-body" style={{ maxHeight: isExpanded ? '1000px' : '0' }}>
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {meal.resolvedItems.map(({ resolved, substituted }, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderBottom: i < meal.resolvedItems.length - 1 ? '1px solid var(--border)' : 'none',
                          background: substituted ? 'var(--green-dim)' : 'transparent',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="body" style={{ color: 'var(--text-1)' }}>{resolved.name}</p>
                          {substituted && (
                            <p style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 600, marginTop: '1px' }}>
                              substituted
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <span style={{ fontSize: '12px', color: substituted ? 'var(--green)' : 'var(--blue)', fontWeight: 600 }}>
                            {resolved.protein}g P
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{resolved.calories} kcal</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Protein sources (filtered) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p className="body-strong" style={{ color: 'var(--text-1)' }}>Protein sources</p>
          {activeDiets.size > 0 && (
            <span className="caption" style={{ color: 'var(--text-3)' }}>
              {filteredSources.length} of {PROTEIN_SOURCES.length} shown
            </span>
          )}
        </div>
        <div style={{
          background: 'var(--surface-1)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: '20px',
        }}>
          {filteredSources.map((source, i) => (
            <div
              key={source.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '11px 14px',
                borderBottom: i < filteredSources.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <p className="body" style={{ color: 'var(--text-1)', flex: 1 }}>{source.name}</p>
              <span style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600 }}>{source.protein}g</span>
            </div>
          ))}
          {filteredSources.length === 0 && (
            <p className="caption" style={{ color: 'var(--text-3)', padding: '16px 14px', textAlign: 'center' }}>
              No sources match your restrictions
            </p>
          )}
        </div>

        {/* Notes */}
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
