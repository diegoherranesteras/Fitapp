-- Cuestionario de bienvenida + plan generado con IA.
-- Ejecútalo entero en el SQL Editor. Se puede re-ejecutar.

alter table public.profiles add column if not exists onboarded_at timestamptz;
alter table public.profiles add column if not exists onboarding jsonb;
-- Macros recomendados según el objetivo y el porqué: la referencia que se muestra al editar los objetivos.
alter table public.profiles add column if not exists macro_reference jsonb;

-- Los usuarios que ya tienen rutina cargada no tienen que pasar por el cuestionario.
update public.profiles p
set onboarded_at = now()
where onboarded_at is null
  and exists (select 1 from public.routine_days d where d.user_id = p.user_id);

-- Guarda un plan completo de forma atómica: o se escribe entero o no se escribe nada.
-- security invoker: se ejecuta con los permisos del usuario que llama, así que RLS sigue aplicando.
create or replace function public.apply_generated_plan(plan jsonb, answers jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  d jsonb;
  b jsonb;
  e jsonb;
  m jsonb;
  d_id uuid;
  b_id uuid;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;

  delete from public.routine_days where user_id = v_user;

  for d in select * from jsonb_array_elements(plan -> 'days') loop
    insert into public.routine_days (user_id, day_of_week, label, accent_color)
    values (v_user, (d ->> 'day_of_week')::int, d ->> 'label', d ->> 'accent_color')
    returning id into d_id;

    for b in select * from jsonb_array_elements(d -> 'blocks') loop
      insert into public.routine_blocks (routine_day_id, time, category, title, subtitle, sort_order)
      values (d_id, b ->> 'time', b ->> 'category', b ->> 'title', nullif(b ->> 'subtitle', ''), (b ->> 'sort_order')::int)
      returning id into b_id;

      for e in select * from jsonb_array_elements(coalesce(b -> 'exercises', '[]'::jsonb)) loop
        insert into public.exercises (routine_block_id, name, target_display, sets_count, sort_order, note)
        values (b_id, e ->> 'name', e ->> 'target_display', (e ->> 'sets_count')::int, (e ->> 'sort_order')::int, nullif(e ->> 'note', ''));
      end loop;

      for m in select * from jsonb_array_elements(coalesce(b -> 'meal_items', '[]'::jsonb)) loop
        insert into public.meal_items (routine_block_id, name, quantity, sort_order)
        values (b_id, m ->> 'name', m ->> 'quantity', (m ->> 'sort_order')::int);
      end loop;
    end loop;
  end loop;

  insert into public.macro_targets (user_id, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, potassium_mg, calcium_mg, iron_mg, vitamin_d_mcg, updated_at)
  select v_user, (t ->> 'calories')::int, (t ->> 'protein_g')::int, (t ->> 'carbs_g')::int, (t ->> 'fat_g')::int,
         (t ->> 'fiber_g')::int, (t ->> 'sodium_mg')::int, (t ->> 'potassium_mg')::int, (t ->> 'calcium_mg')::int,
         (t ->> 'iron_mg')::int, (t ->> 'vitamin_d_mcg')::int, now()
  from (select plan -> 'macros' as t) s
  on conflict (user_id) do update set
    calories = excluded.calories, protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g,
    fiber_g = excluded.fiber_g, sodium_mg = excluded.sodium_mg, potassium_mg = excluded.potassium_mg,
    calcium_mg = excluded.calcium_mg, iron_mg = excluded.iron_mg, vitamin_d_mcg = excluded.vitamin_d_mcg,
    updated_at = excluded.updated_at;

  insert into public.profiles (user_id, onboarded_at, onboarding, macro_reference)
  values (v_user, now(), answers, plan -> 'macro_reference')
  on conflict (user_id) do update set
    onboarded_at = excluded.onboarded_at,
    onboarding = excluded.onboarding,
    macro_reference = excluded.macro_reference;
end;
$$;

grant execute on function public.apply_generated_plan(jsonb, jsonb) to authenticated;
