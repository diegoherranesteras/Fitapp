-- Historial de pesos independiente del plan.
-- Antes, cada serie apuntada colgaba del ejercicio del plan (on delete cascade): al rehacer el plan o
-- quitar un ejercicio se borraba todo su historial. Ahora la serie guarda también el nombre del ejercicio,
-- la referencia "la última vez" se busca por nombre, y si el ejercicio desaparece la serie se queda.
-- Ejecútalo entero en el SQL Editor. Se puede re-ejecutar.

alter table public.exercise_set_logs add column if not exists exercise_name text;

update public.exercise_set_logs l
set exercise_name = e.name
from public.exercises e
where e.id = l.exercise_id and l.exercise_name is null;

alter table public.exercise_set_logs alter column exercise_id drop not null;
alter table public.exercise_set_logs drop constraint if exists exercise_set_logs_exercise_id_fkey;
alter table public.exercise_set_logs
  add constraint exercise_set_logs_exercise_id_fkey
  foreign key (exercise_id) references public.exercises(id) on delete set null;

create index if not exists exercise_set_logs_by_name on public.exercise_set_logs (user_id, exercise_name, date desc);
