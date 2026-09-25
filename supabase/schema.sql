-- Esquema de la app Rutina. Pega esto en el SQL Editor de tu proyecto Supabase y ejecútalo entero.

create extension if not exists "uuid-ossp";

-- ── Perfil ───────────────────────────────────────────────
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  created_at timestamptz not null default now()
);

-- ── Rutina semanal (plantilla) ──────────────────────────
create table if not exists routine_days (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  label text not null,
  accent_color text not null default '#CFA64E',
  unique (user_id, day_of_week)
);

create table if not exists routine_blocks (
  id uuid primary key default uuid_generate_v4(),
  routine_day_id uuid not null references routine_days(id) on delete cascade,
  time text not null,
  category text not null check (category in ('meal','train','rest')),
  title text not null,
  subtitle text,
  sort_order int not null default 0
);

create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  routine_block_id uuid not null references routine_blocks(id) on delete cascade,
  name text not null,
  target_display text not null,
  sets_count int not null default 0,
  sort_order int not null default 0,
  note text
);

create table if not exists meal_items (
  id uuid primary key default uuid_generate_v4(),
  routine_block_id uuid not null references routine_blocks(id) on delete cascade,
  name text not null,
  quantity text not null,
  sort_order int not null default 0
);

-- ── Registro de pesos por serie (sustituye el localStorage de la PWA) ──
create table if not exists exercise_set_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  date date not null,
  set_index int not null,
  weight numeric,
  unique (user_id, exercise_id, date, set_index)
);

-- ── Macros ───────────────────────────────────────────────
create table if not exists macro_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories int not null default 3450,
  protein_g int not null default 190,
  carbs_g int not null default 470,
  fat_g int not null default 90,
  fiber_g int not null default 35,
  sodium_mg int not null default 3000,
  potassium_mg int not null default 4000,
  calcium_mg int not null default 1200,
  iron_mg int not null default 18,
  vitamin_d_mcg int not null default 20,
  updated_at timestamptz not null default now()
);

create table if not exists food_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  calories int not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  logged_at timestamptz not null default now()
);

-- ── Progreso ─────────────────────────────────────────────
create table if not exists weight_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight_kg numeric not null,
  unique (user_id, date)
);

create table if not exists training_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  trained boolean not null default true,
  unique (user_id, date)
);

-- ── Row Level Security ──────────────────────────────────
alter table profiles enable row level security;
alter table routine_days enable row level security;
alter table routine_blocks enable row level security;
alter table exercises enable row level security;
alter table meal_items enable row level security;
alter table exercise_set_logs enable row level security;
alter table macro_targets enable row level security;
alter table food_logs enable row level security;
alter table weight_logs enable row level security;
alter table training_log enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own routine_days" on routine_days;
create policy "own routine_days" on routine_days for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own macro_targets" on macro_targets;
create policy "own macro_targets" on macro_targets for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own food_logs" on food_logs;
create policy "own food_logs" on food_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own weight_logs" on weight_logs;
create policy "own weight_logs" on weight_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own training_log" on training_log;
create policy "own training_log" on training_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own exercise_set_logs" on exercise_set_logs;
create policy "own exercise_set_logs" on exercise_set_logs for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- routine_blocks/exercises/meal_items no tienen user_id propio: se filtran a través del día/bloque padre.
drop policy if exists "own routine_blocks" on routine_blocks;
create policy "own routine_blocks" on routine_blocks for all
  using (routine_day_id in (select id from routine_days where user_id = auth.uid()))
  with check (routine_day_id in (select id from routine_days where user_id = auth.uid()));

drop policy if exists "own exercises" on exercises;
create policy "own exercises" on exercises for all
  using (routine_block_id in (select b.id from routine_blocks b join routine_days d on d.id = b.routine_day_id where d.user_id = auth.uid()))
  with check (routine_block_id in (select b.id from routine_blocks b join routine_days d on d.id = b.routine_day_id where d.user_id = auth.uid()));

drop policy if exists "own meal_items" on meal_items;
create policy "own meal_items" on meal_items for all
  using (routine_block_id in (select b.id from routine_blocks b join routine_days d on d.id = b.routine_day_id where d.user_id = auth.uid()))
  with check (routine_block_id in (select b.id from routine_blocks b join routine_days d on d.id = b.routine_day_id where d.user_id = auth.uid()));

-- Crea el perfil y los objetivos de macros automáticamente al registrarse.
-- Se ejecuta con el rol de Supabase Auth, cuyo search_path no incluye public: hay que cualificar las tablas.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  insert into public.macro_targets (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
