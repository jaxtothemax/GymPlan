export interface Profile {
  id: string
  email: string
  display_name: string | null
  body_weight_kg: number | null
  created_at: string
}

export interface Programme {
  id: string
  user_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkoutSession {
  id: string
  programme_id: string
  user_id: string
  name: string
  category: 'upper' | 'lower' | 'full' | 'cardio' | 'other'
  day_hint: string | null
  notes: string | null
  sort_order: number
  created_at: string
}

export interface Exercise {
  id: string
  workout_session_id: string
  user_id: string
  name: string
  default_sets: number
  rep_range_min: number | null
  rep_range_max: number | null
  rest_seconds: number | null
  effort_notes: string | null
  form_notes: string | null
  youtube_url: string | null
  replaces_exercise: string | null
  is_superset: boolean
  superset_group: string | null
  sort_order: number
  created_at: string
}

export interface LoggedSession {
  id: string
  user_id: string
  workout_session_id: string | null
  programme_id: string | null
  session_name: string
  logged_date: string
  notes: string | null
  created_at: string
}

export interface LoggedSet {
  id: string
  logged_session_id: string
  user_id: string
  exercise_id: string | null
  exercise_name: string
  set_number: number
  reps: number | null
  weight_kg: number | null
  created_at: string
}
