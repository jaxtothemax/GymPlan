create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  body_weight_kg numeric(5,1),
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create table programmes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table programmes enable row level security;
create policy "Users manage own programmes" on programmes for all using (auth.uid() = user_id);

create table workout_sessions (
  id uuid default gen_random_uuid() primary key,
  programme_id uuid references programmes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text check (category in ('upper','lower','full','cardio','other')) default 'other',
  day_hint text,
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table workout_sessions enable row level security;
create policy "Users manage own workout sessions" on workout_sessions for all using (auth.uid() = user_id);

create table exercises (
  id uuid default gen_random_uuid() primary key,
  workout_session_id uuid references workout_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  default_sets integer default 3,
  rep_range_min integer,
  rep_range_max integer,
  rest_seconds integer,
  effort_notes text,
  form_notes text,
  youtube_url text,
  replaces_exercise text,
  is_superset boolean default false,
  superset_group text,
  sort_order integer default 0,
  created_at timestamptz default now()
);
alter table exercises enable row level security;
create policy "Users manage own exercises" on exercises for all using (auth.uid() = user_id);

create table logged_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  workout_session_id uuid references workout_sessions(id) on delete set null,
  programme_id uuid references programmes(id) on delete set null,
  session_name text not null,
  logged_date date not null,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, workout_session_id, logged_date)
);
alter table logged_sessions enable row level security;
create policy "Users manage own logged sessions" on logged_sessions for all using (auth.uid() = user_id);

create table logged_sets (
  id uuid default gen_random_uuid() primary key,
  logged_session_id uuid references logged_sessions(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  exercise_id uuid references exercises(id) on delete set null,
  exercise_name text not null,
  set_number integer not null,
  reps integer,
  weight_kg numeric(6,2),
  created_at timestamptz default now()
);
alter table logged_sets enable row level security;
create policy "Users manage own logged sets" on logged_sets for all using (auth.uid() = user_id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
