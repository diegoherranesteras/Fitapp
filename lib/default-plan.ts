import { dayAccents } from './theme';
import type { Level, MacroReference, OnboardingAnswers } from './types';

// Genera una semana completa sin IA: rutina según los días de gimnasio y comidas escaladas a los macros.
// Devuelve el mismo formato que espera la función SQL apply_generated_plan.

export interface PlanExercise { name: string; target_display: string; sets_count: number; note: string; sort_order: number }
export interface PlanMealItem { name: string; quantity: string; sort_order: number }
export interface PlanBlock {
  time: string;
  category: 'meal' | 'train' | 'rest';
  title: string;
  subtitle: string;
  sort_order: number;
  exercises: PlanExercise[];
  meal_items: PlanMealItem[];
}
export interface PlanDay { day_of_week: number; label: string; accent_color: string; blocks: PlanBlock[] }

// ── Rutinas ──
type Ex = [name: string, sets: number, reps: string];
const REST_NOTE = 'Descansa 2-3 min en los básicos y 1-2 min en el resto. Sube peso cuando completes todas las repeticiones.';

const WORKOUTS: Record<string, { title: string; exercises: Ex[] }> = {
  fullA: { title: 'Cuerpo completo A', exercises: [['Sentadilla', 4, '6-8'], ['Press banca', 4, '6-8'], ['Remo con barra', 3, '8-10'], ['Peso muerto rumano', 3, '8-10'], ['Elevaciones laterales', 3, '12-15'], ['Plancha', 3, '30-45 s']] },
  fullB: { title: 'Cuerpo completo B', exercises: [['Peso muerto', 3, '5'], ['Press militar', 4, '6-8'], ['Dominadas o jalón al pecho', 4, '8-10'], ['Zancadas', 3, '10/lado'], ['Curl de bíceps', 3, '10-12'], ['Extensión de tríceps en polea', 3, '10-12']] },
  fullC: { title: 'Cuerpo completo C', exercises: [['Prensa', 4, '10-12'], ['Press inclinado con mancuernas', 3, '8-10'], ['Remo en polea', 3, '10-12'], ['Hip thrust', 3, '8-10'], ['Face pulls', 3, '15'], ['Elevación de gemelos', 3, '12-15']] },
  torsoA: { title: 'Torso A', exercises: [['Press banca', 4, '6-8'], ['Remo con barra', 4, '6-8'], ['Press militar', 3, '8-10'], ['Jalón al pecho', 3, '10-12'], ['Elevaciones laterales', 3, '12-15'], ['Curl de bíceps', 3, '10-12']] },
  torsoB: { title: 'Torso B', exercises: [['Press inclinado con mancuernas', 4, '8-10'], ['Dominadas', 4, '6-10'], ['Fondos', 3, '8-12'], ['Remo en polea', 3, '10-12'], ['Face pulls', 3, '15'], ['Extensión de tríceps en polea', 3, '12']] },
  piernaA: { title: 'Pierna A', exercises: [['Sentadilla', 4, '6-8'], ['Peso muerto rumano', 3, '8-10'], ['Prensa', 3, '10-12'], ['Curl femoral', 3, '10-12'], ['Elevación de gemelos', 4, '12-15']] },
  piernaB: { title: 'Pierna B', exercises: [['Peso muerto', 3, '5'], ['Sentadilla búlgara', 3, '8-10/lado'], ['Hip thrust', 3, '8-10'], ['Extensión de cuádriceps', 3, '12-15'], ['Plancha', 3, '45 s']] },
  empujeA: { title: 'Empuje A', exercises: [['Press banca', 4, '6-8'], ['Press militar', 3, '8-10'], ['Press inclinado con mancuernas', 3, '10-12'], ['Elevaciones laterales', 4, '12-15'], ['Extensión de tríceps en polea', 3, '12']] },
  empujeB: { title: 'Empuje B', exercises: [['Press inclinado con barra', 4, '6-8'], ['Press Arnold', 3, '10'], ['Fondos', 3, '8-12'], ['Aperturas en polea', 3, '12-15'], ['Press francés', 3, '10-12']] },
  tironA: { title: 'Tirón A', exercises: [['Dominadas o jalón al pecho', 4, '6-10'], ['Remo con barra', 4, '8-10'], ['Face pulls', 3, '15'], ['Curl con barra', 3, '10-12'], ['Curl martillo', 3, '12']] },
  tironB: { title: 'Tirón B', exercises: [['Peso muerto', 3, '5'], ['Remo en polea', 4, '10-12'], ['Jalón agarre estrecho', 3, '10-12'], ['Pájaros', 3, '15'], ['Curl inclinado', 3, '12']] },
};

// Días de gimnasio repartidos para dejar descanso entre sesiones; el domingo siempre libre.
const GYM_DAYS: Record<number, number[]> = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
const SPLITS: Record<number, string[]> = {
  1: ['fullA'],
  2: ['fullA', 'fullB'],
  3: ['fullA', 'fullB', 'fullC'],
  4: ['torsoA', 'piernaA', 'torsoB', 'piernaB'],
  5: ['torsoA', 'piernaA', 'empujeA', 'tironA', 'piernaB'],
  6: ['empujeA', 'tironA', 'piernaA', 'empujeB', 'tironB', 'piernaB'],
};

function buildExercises(key: string, level: Level): PlanExercise[] {
  return WORKOUTS[key].exercises.map(([name, sets, reps], i) => {
    const adjusted = level === 'beginner' ? Math.max(2, sets - 1) : level === 'advanced' && i === 0 ? sets + 1 : sets;
    return { name, target_display: `${adjusted}×${reps}`, sets_count: adjusted, note: i === 0 ? REST_NOTE : '', sort_order: i + 1 };
  });
}

// ── Alimentos (por 100 g; unidades en gramos por pieza) ──
interface Food { name: string; p: number; c: number; f: number; unit?: { grams: number; singular: string; plural: string }; min: number; max: number }
const F: Record<string, Food> = {
  avena: { name: 'Avena', p: 13, c: 60, f: 7, min: 30, max: 150 },
  arroz: { name: 'Arroz (en crudo)', p: 7, c: 78, f: 0.6, min: 40, max: 220 },
  pasta: { name: 'Pasta (en crudo)', p: 12, c: 71, f: 1.5, min: 40, max: 220 },
  patata: { name: 'Patata', p: 2, c: 17, f: 0.1, min: 100, max: 700 },
  pan: { name: 'Pan integral', p: 9, c: 41, f: 3.5, min: 30, max: 160 },
  platano: { name: 'Plátano', p: 1.1, c: 23, f: 0.3, unit: { grams: 120, singular: 'unidad', plural: 'unidades' }, min: 1, max: 3 },
  pollo: { name: 'Pechuga de pollo (en crudo)', p: 23, c: 0, f: 1.5, min: 80, max: 350 },
  ternera: { name: 'Ternera magra (en crudo)', p: 21, c: 0, f: 5, min: 80, max: 350 },
  merluza: { name: 'Merluza', p: 18, c: 0, f: 1.5, min: 100, max: 400 },
  salmon: { name: 'Salmón', p: 20, c: 0, f: 13, min: 80, max: 300 },
  huevo: { name: 'Huevos', p: 12.6, c: 1, f: 10, unit: { grams: 60, singular: 'unidad', plural: 'unidades' }, min: 1, max: 5 },
  yogur: { name: 'Yogur alto en proteína', p: 10, c: 4, f: 0.2, min: 120, max: 500 },
  pavo: { name: 'Pechuga de pavo en lonchas', p: 20, c: 1, f: 2, min: 30, max: 150 },
  pavoFresco: { name: 'Pechuga de pavo (en crudo)', p: 22, c: 0, f: 1, min: 80, max: 350 },
  leche: { name: 'Leche semidesnatada', p: 3.3, c: 4.8, f: 1.6, min: 0, max: 0 },
  verdura: { name: 'Verdura variada', p: 2, c: 5, f: 0.3, min: 0, max: 0 },
  aceite: { name: 'Aceite de oliva', p: 0, c: 0, f: 100, min: 0, max: 30 },
  frutos: { name: 'Frutos secos', p: 20, c: 15, f: 50, min: 0, max: 50 },
};

interface MealDef { title: string; carb: string; protein: string; fat?: string; fixed?: [food: string, grams: number][] }
interface Macro3 { p: number; c: number; f: number }

// Rota los alimentos principales para que la semana no sea siempre igual.
const rot = <T,>(list: T[], day: number) => list[day % list.length];
// lean: en definición se evitan las proteínas grasas para no pasarse de grasa.
const MEALS = {
  desayuno: (_d: number, _lean: boolean): MealDef => ({ title: 'Desayuno', carb: 'avena', protein: 'huevo', fixed: [['leche', 250]] }),
  mediaManana: (_d: number, _lean: boolean): MealDef => ({ title: 'Media mañana', carb: 'pan', protein: 'pavo', fat: 'frutos' }),
  comida: (d: number, _lean: boolean): MealDef => ({ title: 'Comida', carb: rot(['arroz', 'pasta', 'patata'], d), protein: rot(['pollo', 'ternera', 'merluza'], d), fat: 'aceite', fixed: [['verdura', 200]] }),
  merienda: (_d: number, _lean: boolean): MealDef => ({ title: 'Merienda', carb: 'pan', protein: 'pavo', fat: 'frutos' }),
  pre: (_d: number, _lean: boolean): MealDef => ({ title: 'Pre-entreno', carb: 'platano', protein: 'yogur' }),
  cena: (d: number, lean: boolean): MealDef => ({
    title: 'Cena',
    carb: rot(['patata', 'arroz', 'pasta'], d + 1),
    protein: rot(lean ? ['merluza', 'pollo', 'pavoFresco'] : ['merluza', 'pollo', 'salmon'], d + 1),
    fat: 'aceite',
    fixed: [['verdura', 200]],
  }),
};

const macrosOf = (food: Food, grams: number): Macro3 => ({ p: (food.p * grams) / 100, c: (food.c * grams) / 100, f: (food.f * grams) / 100 });
const add = (a: Macro3, b: Macro3): Macro3 => ({ p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });

function portion(food: Food, gramsNeeded: number) {
  if (food.unit) {
    const units = Math.min(food.max, Math.max(food.min, Math.round(gramsNeeded / food.unit.grams)));
    return { grams: units * food.unit.grams, label: `${units} ${units === 1 ? food.unit.singular : food.unit.plural}` };
  }
  const step = gramsNeeded >= 100 ? 10 : 5;
  const grams = Math.min(food.max, Math.max(food.min, Math.round(gramsNeeded / step) * step));
  return { grams, label: `${grams} g` };
}

// Carbohidrato → proteína → grasa, restando lo que ya aporta cada alimento anterior.
function scaleMeal(def: MealDef, target: Macro3) {
  const items: { name: string; quantity: string }[] = [];
  let got: Macro3 = { p: 0, c: 0, f: 0 };
  for (const [key, grams] of def.fixed ?? []) {
    got = add(got, macrosOf(F[key], grams));
    items.push({ name: F[key].name, quantity: key === 'leche' ? `${grams} ml` : `${grams} g` });
  }
  const carb = F[def.carb];
  const c = portion(carb, ((target.c - got.c) / carb.c) * 100);
  got = add(got, macrosOf(carb, c.grams));
  const protein = F[def.protein];
  const p = portion(protein, ((target.p - got.p) / protein.p) * 100);
  got = add(got, macrosOf(protein, p.grams));
  items.unshift({ name: protein.name, quantity: p.label });
  items.unshift({ name: carb.name, quantity: c.label });
  if (def.fat) {
    const fat = F[def.fat];
    const needed = ((target.f - got.f) / fat.f) * 100;
    if (needed >= 5) {
      const f = portion(fat, needed);
      got = add(got, macrosOf(fat, f.grams));
      items.push({ name: fat.name, quantity: f.label });
    }
  }
  const subtitle = [carb, protein].map((x) => x.name.replace(/ \(.*\)$/, '').toLowerCase()).join(' + ');
  return { items, subtitle, got };
}

// ── Horario ──
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };

type MealSlot = { meal: keyof typeof MEALS; at: number; share: number; title?: string };
type Slot = MealSlot | { gym: true; at: number };

const round15 = (m: number) => Math.round(m / 15) * 15;

// Todas las horas en "minutos del día de la persona": lo que cae antes de despertarse se cuenta como +24 h.
function daySlots(gymStart: number | null, minutes: number, wake: number, sleep: number): Slot[] {
  const latest = sleep - 45; // última comida como tarde 45 min antes de dormir
  const mains: MealSlot[] = [
    { meal: 'desayuno', at: wake + 30, share: 0.25 },
    { meal: 'comida', at: Math.max(toMin('14:00'), wake + 240), share: 0.3 },
    { meal: 'cena', at: Math.min(toMin('21:00'), latest), share: gymStart == null ? 0.3 : 0.25 },
  ];

  if (gymStart == null) {
    const merienda: MealSlot = { meal: 'merienda', at: round15((mains[1].at + mains[2].at) / 2), share: 0.15 };
    return [...mains, merienda];
  }

  const end = gymStart + minutes;

  // 1. Ninguna comida principal justo antes o durante el entreno: se pasa a después (post-entreno),
  //    o antes si después ya no da tiempo a comer antes de dormir.
  for (const m of mains) {
    if (m.at >= gymStart - 60 && m.at <= end) {
      const title = MEALS[m.meal](0, false).title;
      if (end + 30 <= latest) {
        m.at = end + 30;
        m.title = `${title} · post-entreno`;
      } else {
        m.at = gymStart - 120;
        m.title = `${title} · pre-entreno`;
      }
    }
  }
  mains.sort((x, y) => x.at - y.at);
  for (let i = 1; i < mains.length; i++) mains[i].at = Math.max(mains[i].at, mains[i - 1].at + 150);
  for (const m of mains) m.at = round15(Math.min(m.at, latest));

  const slots: Slot[] = [...mains, { gym: true, at: gymStart }];
  let snackShare = 0.1;

  // 2. Pre-entreno: si ya hay una comida principal entre 2,5 h y 45 min antes, hace de pre-entreno.
  const mainBefore = mains.some((m) => m.at >= gymStart - 150 && m.at <= gymStart - 45);
  if (mainBefore) snackShare += 0.1;
  else slots.push({ meal: 'pre', at: round15(Math.max(wake + 10, gymStart - 75)), share: 0.1 });

  // 3. Post-entreno: si no hay comida en las 2 h siguientes, el tentempié se convierte en post-entreno.
  const mainAfter = mains.some((m) => m.at > end && m.at <= end + 120);
  if (!mainAfter && end + 30 <= latest) {
    slots.push({ meal: 'merienda', at: round15(end + 30), share: snackShare, title: 'Post-entreno' });
    return slots;
  }

  // 4. Si no, el tentempié va en el hueco más largo del día (sin pisar el entreno).
  const busy = [...mains.map((m) => [m.at, m.at]), [gymStart, end]].sort((x, y) => x[0] - y[0]);
  let best: [number, number] | null = null;
  for (let i = 1; i < busy.length; i++) {
    const gap: [number, number] = [busy[i - 1][1], busy[i][0]];
    if (gap[1] - gap[0] >= 150 && (!best || gap[1] - gap[0] > best[1] - best[0])) best = gap;
  }
  if (best) {
    const at = round15((best[0] + best[1]) / 2);
    slots.push({ meal: at < toMin('12:30') ? 'mediaManana' : 'merienda', at, share: snackShare });
  } else {
    mains.find((m) => m.meal === 'comida')!.share += snackShare;
  }
  return slots;
}

export function buildDefaultPlan(a: OnboardingAnswers, m: MacroReference): { days: PlanDay[] } {
  const gymDays = GYM_DAYS[a.gym_days];
  const split = SPLITS[a.gym_days];
  const wake = toMin(a.wake_time);
  // Horas anteriores a despertarse (acostarse o entrenar pasada la medianoche) cuentan como del mismo día.
  const dayMin = (t: string) => { const x = toMin(t); return x < wake ? x + 1440 : x; };
  const sleep = dayMin(a.sleep_time);
  const training = dayMin(a.training_time);

  const days: PlanDay[] = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const gymIndex = gymDays.indexOf(dow);
    const workoutKey = gymIndex >= 0 ? split[gymIndex] : null;
    const raw: Omit<PlanBlock, 'sort_order'>[] = [
      { time: fromMin(wake), category: 'rest', title: 'Despertar', subtitle: '', exercises: [], meal_items: [] },
    ];

    for (const slot of daySlots(workoutKey ? training : null, a.session_minutes, wake, sleep)) {
      if ('gym' in slot) {
        const w = WORKOUTS[workoutKey!];
        raw.push({
          time: fromMin(slot.at),
          category: 'train',
          title: `Gym · ${w.title}`,
          subtitle: `${w.exercises.length} ejercicios · ${a.session_minutes} min`,
          exercises: buildExercises(workoutKey!, a.level),
          meal_items: [],
        });
      } else {
        const def = MEALS[slot.meal](dow, a.goal === 'fat_loss');
        const meal = scaleMeal(def, { p: m.protein_g * slot.share, c: m.carbs_g * slot.share, f: m.fat_g * slot.share });
        raw.push({
          time: fromMin(slot.at),
          category: 'meal',
          title: slot.title ?? def.title,
          subtitle: meal.subtitle,
          exercises: [],
          meal_items: meal.items.map((it, i) => ({ ...it, sort_order: i + 1 })),
        });
      }
    }

    raw.push({ time: fromMin(sleep - 60), category: 'rest', title: 'Desconexión', subtitle: 'sin pantallas', exercises: [], meal_items: [] });
    raw.push({ time: fromMin(sleep), category: 'rest', title: 'Dormir', subtitle: '', exercises: [], meal_items: [] });

    const blocks = raw
      .sort((x, y) => dayMin(x.time) - dayMin(y.time))
      .map((b, i) => ({ ...b, sort_order: i + 1 }));

    return {
      day_of_week: dow,
      label: workoutKey ? `${WORKOUTS[workoutKey].title} · Gym` : 'Descanso',
      accent_color: dayAccents[dow],
      blocks,
    };
  });

  return { days };
}
