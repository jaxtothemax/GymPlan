import { supabase } from './supabase'

export async function seedDefaultData(userId: string) {
  // Check if user already has programmes
  const { data: existing, error: checkErr } = await supabase
    .from('programmes')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (checkErr) {
    console.error('Error checking programmes:', checkErr)
    return
  }

  if (existing && existing.length > 0) {
    return // Already seeded
  }

  // Insert programme
  const { data: prog, error: progErr } = await supabase
    .from('programmes')
    .insert({
      user_id: userId,
      name: 'Built With Science Upper/Lower',
      description: 'Science-based 4-day upper/lower split optimised for hypertrophy.',
      is_active: true,
    })
    .select()
    .single()

  if (progErr || !prog) {
    console.error('Error inserting programme:', progErr)
    return
  }

  const programmeId = prog.id

  // Insert sessions
  const sessions = [
    { name: 'Upper Body 1', category: 'upper', day_hint: 'Monday', sort_order: 0 },
    { name: 'Lower Body 1', category: 'lower', day_hint: 'Tuesday', sort_order: 1 },
    { name: 'Upper Body 2', category: 'upper', day_hint: 'Thursday', sort_order: 2 },
    { name: 'Lower Body 2', category: 'lower', day_hint: 'Friday', sort_order: 3 },
  ]

  const { data: insertedSessions, error: sessErr } = await supabase
    .from('workout_sessions')
    .insert(sessions.map(s => ({ ...s, programme_id: programmeId, user_id: userId })))
    .select()

  if (sessErr || !insertedSessions) {
    console.error('Error inserting sessions:', sessErr)
    return
  }

  const upper1 = insertedSessions.find(s => s.name === 'Upper Body 1')
  const upper2 = insertedSessions.find(s => s.name === 'Upper Body 2')
  const lower1 = insertedSessions.find(s => s.name === 'Lower Body 1')
  const lower2 = insertedSessions.find(s => s.name === 'Lower Body 2')

  if (!upper1 || !upper2 || !lower1 || !lower2) {
    console.error('Could not find inserted sessions')
    return
  }

  // Upper Body 1 exercises
  const upper1Exercises = [
    {
      name: 'Flat Dumbbell Press',
      default_sets: 3,
      rep_range_min: 6,
      rep_range_max: 10,
      rest_seconds: 150,
      effort_notes: 'Shy, Shy, To failure',
      form_notes: 'Elbows 45–60°. No barbell.',
      youtube_url: 'https://youtu.be/pCGVSBk0bIQ',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 0,
    },
    {
      name: 'Dumbbell Chest Supported Row',
      default_sets: 3,
      rep_range_min: 8,
      rep_range_max: 12,
      rest_seconds: 150,
      effort_notes: 'Shy, Shy, To failure',
      form_notes: 'Pull elbows to back pockets.',
      youtube_url: 'https://youtu.be/Q-5V5T55giY',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 1,
    },
    {
      name: 'Pec-Deck Machine Fly',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Full stretch at end range.',
      youtube_url: 'https://youtu.be/rnV3y1P7894',
      replaces_exercise: 'Seated Cable Fly',
      is_superset: false,
      superset_group: null,
      sort_order: 2,
    },
    {
      name: 'Lat Pulldown',
      default_sets: 3,
      rep_range_min: 8,
      rep_range_max: 12,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, To failure + lengthened partials',
      form_notes: 'Depress shoulders first. Thumbless grip.',
      youtube_url: 'https://youtu.be/AvYZZhEl7Xk',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 3,
    },
    {
      name: 'Dumbbell Lateral Raises',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 20,
      rest_seconds: 60,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Y shape, 15–30° in front of body.',
      youtube_url: 'https://youtu.be/zcO3sgAeLA0',
      replaces_exercise: 'Cable Lateral Raises',
      is_superset: false,
      superset_group: null,
      sort_order: 4,
    },
    {
      name: 'Incline Dumbbell Curls',
      default_sets: 2,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials',
      form_notes: 'Arms hang fully at bottom.',
      youtube_url: 'https://youtu.be/3D56VDVkQnM',
      replaces_exercise: 'Behind Body Cable Curls',
      is_superset: false,
      superset_group: null,
      sort_order: 5,
    },
    {
      name: 'Tricep Pushdowns',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Lean torso 30° forward. Elbows locked.',
      youtube_url: 'https://youtu.be/MlfCS_7ZLXA',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 6,
    },
  ]

  // Upper Body 2 exercises
  const upper2Exercises = [
    {
      name: 'Low Incline Dumbbell Press',
      default_sets: 3,
      rep_range_min: 6,
      rep_range_max: 10,
      rest_seconds: 150,
      effort_notes: 'Shy, Shy, To failure',
      form_notes: '15–30° incline. Elbows 45–60°.',
      youtube_url: 'https://youtu.be/jW4j7FoqudI',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 0,
    },
    {
      name: 'Lat Pulldown',
      default_sets: 3,
      rep_range_min: 6,
      rep_range_max: 10,
      rest_seconds: 150,
      effort_notes: 'Shy, Shy, To failure',
      form_notes: 'Use if pull-ups cause shoulder pain.',
      youtube_url: 'https://youtu.be/AvYZZhEl7Xk',
      replaces_exercise: 'Pull-Ups',
      is_superset: false,
      superset_group: null,
      sort_order: 1,
    },
    {
      name: 'Pec-Deck Machine Fly',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, To failure + lengthened partials',
      form_notes: 'Full range. Pause at stretch.',
      youtube_url: 'https://youtu.be/rnV3y1P7894',
      replaces_exercise: 'Seated Cable Fly',
      is_superset: false,
      superset_group: null,
      sort_order: 2,
    },
    {
      name: 'Seated Cable Row',
      default_sets: 3,
      rep_range_min: 8,
      rep_range_max: 12,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, To failure + lengthened partials',
      form_notes: 'Let upper body round forward to open back.',
      youtube_url: 'https://youtu.be/kNvy2_9Ji2w',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 3,
    },
    {
      name: 'Dumbbell Lateral Raises',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 20,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, To failure + lengthened partials',
      form_notes: 'Y shape, 15–30° in front.',
      youtube_url: 'https://youtu.be/zcO3sgAeLA0',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 4,
    },
    {
      name: 'Tricep Pushdowns',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Safer than overhead extension for loose shoulders.',
      youtube_url: 'https://youtu.be/MlfCS_7ZLXA',
      replaces_exercise: 'Incline DB Overhead Extension',
      is_superset: false,
      superset_group: null,
      sort_order: 5,
    },
    {
      name: 'Incline Dumbbell Curls',
      default_sets: 2,
      rep_range_min: 8,
      rep_range_max: 12,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials',
      form_notes: '60° bench, arms hang fully at bottom.',
      youtube_url: 'https://youtu.be/3D56VDVkQnM',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 6,
    },
  ]

  // Lower Body 1 exercises
  const lower1Exercises = [
    {
      name: 'Barbell Back Squat',
      default_sets: 3,
      rep_range_min: 6,
      rep_range_max: 10,
      rest_seconds: 150,
      effort_notes: 'Shy, Shy, Shy',
      form_notes: 'No failure. Depth over weight.',
      youtube_url: 'https://youtu.be/Hj0dNZ9_LAE',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 0,
    },
    {
      name: 'Seated Leg Curls',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 60,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Stop just before legs fully extend.',
      youtube_url: 'https://youtu.be/aYy3alWRDmk',
      replaces_exercise: null,
      is_superset: true,
      superset_group: 'A',
      sort_order: 1,
    },
    {
      name: 'Seated Leg Extensions',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Pause briefly at top.',
      youtube_url: 'https://youtu.be/3SeCC8ABZ_Q',
      replaces_exercise: null,
      is_superset: true,
      superset_group: 'A',
      sort_order: 2,
    },
    {
      name: 'Hyperextensions',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, Shy',
      form_notes: 'No failure. Stop when torso is level.',
      youtube_url: 'https://youtu.be/ZxwBq-vhzwU',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 3,
    },
    {
      name: 'Standing Calf Raise',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Hold stretch 2–4 sec at bottom.',
      youtube_url: 'https://youtu.be/_ChZv2iluM8',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 4,
    },
  ]

  // Lower Body 2 exercises
  const lower2Exercises = [
    {
      name: 'Barbell Hip Thrust',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, To failure',
      form_notes: 'Pad the bar. Pause 1–2 sec at top.',
      youtube_url: 'https://youtu.be/_vBMijiZoxE',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 0,
    },
    {
      name: 'Barbell Romanian Deadlift',
      default_sets: 3,
      rep_range_min: 6,
      rep_range_max: 10,
      rest_seconds: 150,
      effort_notes: 'Shy, Shy, Shy',
      form_notes: 'No failure. Stop at knee/mid-shin.',
      youtube_url: 'https://youtu.be/Xu4DxwKWzl4',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 1,
    },
    {
      name: 'Front Foot Elevated Reverse Lunge',
      default_sets: 3,
      rep_range_min: 6,
      rep_range_max: 10,
      rest_seconds: 120,
      effort_notes: 'Shy, Shy, To failure',
      form_notes: 'Lean 20° forward. Drive through front heel.',
      youtube_url: 'https://youtu.be/AUEGDvCrQJA',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 2,
    },
    {
      name: 'Standing Calf Raise',
      default_sets: 3,
      rep_range_min: 10,
      rep_range_max: 15,
      rest_seconds: 120,
      effort_notes: 'Shy, To failure + lengthened partials, To failure + lengthened partials',
      form_notes: 'Hold stretch 2–4 sec at bottom.',
      youtube_url: 'https://youtu.be/cRKA_Qdut7I',
      replaces_exercise: null,
      is_superset: false,
      superset_group: null,
      sort_order: 3,
    },
  ]

  const allExercises = [
    ...upper1Exercises.map(e => ({ ...e, workout_session_id: upper1.id, user_id: userId })),
    ...upper2Exercises.map(e => ({ ...e, workout_session_id: upper2.id, user_id: userId })),
    ...lower1Exercises.map(e => ({ ...e, workout_session_id: lower1.id, user_id: userId })),
    ...lower2Exercises.map(e => ({ ...e, workout_session_id: lower2.id, user_id: userId })),
  ]

  const { data: insertedExercises, error: exErr } = await supabase
    .from('exercises')
    .insert(allExercises)
    .select()

  if (exErr || !insertedExercises) {
    console.error('Error inserting exercises:', exErr)
    return
  }

  // Find exercise IDs for Upper Body 1
  const findExercise = (sessionId: string, name: string) =>
    insertedExercises.find(e => e.workout_session_id === sessionId && e.name === name)

  // Insert logged session for 2026-03-17
  const { data: loggedSess, error: logSessErr } = await supabase
    .from('logged_sessions')
    .insert({
      user_id: userId,
      workout_session_id: upper1.id,
      programme_id: programmeId,
      session_name: 'Upper Body 1',
      logged_date: '2026-03-17',
      notes: null,
    })
    .select()
    .single()

  if (logSessErr || !loggedSess) {
    console.error('Error inserting logged session:', logSessErr)
    return
  }

  const loggedSessionId = loggedSess.id

  const flatPress = findExercise(upper1.id, 'Flat Dumbbell Press')
  const latPull = findExercise(upper1.id, 'Lat Pulldown')
  const dbRow = findExercise(upper1.id, 'Dumbbell Chest Supported Row')
  const latRaises = findExercise(upper1.id, 'Dumbbell Lateral Raises')
  const inclineCurls = findExercise(upper1.id, 'Incline Dumbbell Curls')
  const tricepPush = findExercise(upper1.id, 'Tricep Pushdowns')

  const loggedSets = [
    // Flat Dumbbell Press
    { exercise_id: flatPress?.id ?? null, exercise_name: 'Flat Dumbbell Press', set_number: 1, reps: 15, weight_kg: 10 },
    { exercise_id: flatPress?.id ?? null, exercise_name: 'Flat Dumbbell Press', set_number: 2, reps: 15, weight_kg: 12.5 },
    { exercise_id: flatPress?.id ?? null, exercise_name: 'Flat Dumbbell Press', set_number: 3, reps: 15, weight_kg: 12.5 },
    // Lat Pulldown
    { exercise_id: latPull?.id ?? null, exercise_name: 'Lat Pulldown', set_number: 1, reps: 15, weight_kg: 25 },
    { exercise_id: latPull?.id ?? null, exercise_name: 'Lat Pulldown', set_number: 2, reps: 12, weight_kg: 35 },
    { exercise_id: latPull?.id ?? null, exercise_name: 'Lat Pulldown', set_number: 3, reps: 12, weight_kg: 39 },
    // Dumbbell Chest Supported Row
    { exercise_id: dbRow?.id ?? null, exercise_name: 'Dumbbell Chest Supported Row', set_number: 1, reps: 10, weight_kg: 10 },
    { exercise_id: dbRow?.id ?? null, exercise_name: 'Dumbbell Chest Supported Row', set_number: 2, reps: 10, weight_kg: 10 },
    { exercise_id: dbRow?.id ?? null, exercise_name: 'Dumbbell Chest Supported Row', set_number: 3, reps: 10, weight_kg: 10 },
    // Dumbbell Lateral Raises
    { exercise_id: latRaises?.id ?? null, exercise_name: 'Dumbbell Lateral Raises', set_number: 1, reps: 8, weight_kg: 5 },
    { exercise_id: latRaises?.id ?? null, exercise_name: 'Dumbbell Lateral Raises', set_number: 2, reps: 8, weight_kg: 5 },
    { exercise_id: latRaises?.id ?? null, exercise_name: 'Dumbbell Lateral Raises', set_number: 3, reps: 6, weight_kg: 5 },
    // Incline Dumbbell Curls
    { exercise_id: inclineCurls?.id ?? null, exercise_name: 'Incline Dumbbell Curls', set_number: 1, reps: 10, weight_kg: 10 },
    { exercise_id: inclineCurls?.id ?? null, exercise_name: 'Incline Dumbbell Curls', set_number: 2, reps: 10, weight_kg: 7.5 },
    { exercise_id: inclineCurls?.id ?? null, exercise_name: 'Incline Dumbbell Curls', set_number: 3, reps: 11, weight_kg: 7.5 },
    // Tricep Pushdowns
    { exercise_id: tricepPush?.id ?? null, exercise_name: 'Tricep Pushdowns', set_number: 1, reps: 10, weight_kg: 9 },
    { exercise_id: tricepPush?.id ?? null, exercise_name: 'Tricep Pushdowns', set_number: 2, reps: 10, weight_kg: 9 },
    { exercise_id: tricepPush?.id ?? null, exercise_name: 'Tricep Pushdowns', set_number: 3, reps: 10, weight_kg: 9 },
  ]

  const { error: setsErr } = await supabase
    .from('logged_sets')
    .insert(loggedSets.map(s => ({ ...s, logged_session_id: loggedSessionId, user_id: userId })))

  if (setsErr) {
    console.error('Error inserting logged sets:', setsErr)
  }
}
