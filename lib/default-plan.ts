import { dayAccents } from './theme';
import type { Level, MacroReference, OnboardingAnswers } from './types';
import { knownLabel, translator, type Lang, type StringKey, type Translate } from './i18n';

// Genera una semana completa sin IA: rutina según los días de gimnasio y comidas escaladas a los macros.
// Devuelve el mismo formato que espera la función SQL apply_generated_plan. Los textos (títulos, alimentos)
// salen en el idioma pedido y se guardan así; los nombres de ejercicios van en español.

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

// El título de cada rutina se traduce con la clave workout.<clave>.
const WORKOUTS: Record<string, { exercises: Ex[] }> = {
  fullA: { exercises: [['Sentadilla', 4, '6-8'], ['Press banca', 4, '6-8'], ['Remo con barra', 3, '8-10'], ['Peso muerto rumano', 3, '8-10'], ['Elevaciones laterales', 3, '12-15'], ['Plancha', 3, '30-45 s']] },
  fullB: { exercises: [['Peso muerto', 3, '5'], ['Press militar', 4, '6-8'], ['Dominadas o jalón al pecho', 4, '8-10'], ['Zancadas', 3, '10/lado'], ['Curl de bíceps', 3, '10-12'], ['Extensión de tríceps en polea', 3, '10-12']] },
  fullC: { exercises: [['Prensa', 4, '10-12'], ['Press inclinado con mancuernas', 3, '8-10'], ['Remo en polea', 3, '10-12'], ['Hip thrust', 3, '8-10'], ['Face pulls', 3, '15'], ['Elevación de gemelos', 3, '12-15']] },
  torsoA: { exercises: [['Press banca', 4, '6-8'], ['Remo con barra', 4, '6-8'], ['Press militar', 3, '8-10'], ['Jalón al pecho', 3, '10-12'], ['Elevaciones laterales', 3, '12-15'], ['Curl de bíceps', 3, '10-12']] },
  torsoB: { exercises: [['Press inclinado con mancuernas', 4, '8-10'], ['Dominadas', 4, '6-10'], ['Fondos', 3, '8-12'], ['Remo en polea', 3, '10-12'], ['Face pulls', 3, '15'], ['Extensión de tríceps en polea', 3, '12']] },
  piernaA: { exercises: [['Sentadilla', 4, '6-8'], ['Peso muerto rumano', 3, '8-10'], ['Prensa', 3, '10-12'], ['Curl femoral', 3, '10-12'], ['Elevación de gemelos', 4, '12-15']] },
  piernaB: { exercises: [['Peso muerto', 3, '5'], ['Sentadilla búlgara', 3, '8-10/lado'], ['Hip thrust', 3, '8-10'], ['Extensión de cuádriceps', 3, '12-15'], ['Plancha', 3, '45 s']] },
  empujeA: { exercises: [['Press banca', 4, '6-8'], ['Press militar', 3, '8-10'], ['Press inclinado con mancuernas', 3, '10-12'], ['Elevaciones laterales', 4, '12-15'], ['Extensión de tríceps en polea', 3, '12']] },
  empujeB: { exercises: [['Press inclinado con barra', 4, '6-8'], ['Press Arnold', 3, '10'], ['Fondos', 3, '8-12'], ['Aperturas en polea', 3, '12-15'], ['Press francés', 3, '10-12']] },
  tironA: { exercises: [['Dominadas o jalón al pecho', 4, '6-10'], ['Remo con barra', 4, '8-10'], ['Face pulls', 3, '15'], ['Curl con barra', 3, '10-12'], ['Curl martillo', 3, '12']] },
  tironB: { exercises: [['Peso muerto', 3, '5'], ['Remo en polea', 4, '10-12'], ['Jalón agarre estrecho', 3, '10-12'], ['Pájaros', 3, '15'], ['Curl inclinado', 3, '12']] },
};

const SPLITS: Record<number, string[]> = {
  1: ['fullA'],
  2: ['fullA', 'fullB'],
  3: ['fullA', 'fullB', 'fullC'],
  4: ['torsoA', 'piernaA', 'torsoB', 'piernaB'],
  5: ['torsoA', 'piernaA', 'empujeA', 'tironA', 'piernaB'],
  6: ['empujeA', 'tironA', 'piernaA', 'empujeB', 'tironB', 'piernaB'],
};

function buildExercises(key: string, level: Level, t: Translate): PlanExercise[] {
  return WORKOUTS[key].exercises.map(([name, sets, reps], i) => {
    const adjusted = level === 'beginner' ? Math.max(2, sets - 1) : level === 'advanced' && i === 0 ? sets + 1 : sets;
    return { name, target_display: `${adjusted}×${reps}`, sets_count: adjusted, note: i === 0 ? t('plan.restNote') : '', sort_order: i + 1 };
  });
}

// ── Alimentos (por 100 g; unidades en gramos por pieza) ──
// El nombre de cada alimento se traduce con la clave food.<clave>.
interface Food { p: number; c: number; f: number; unitGrams?: number; min: number; max: number }
const F: Record<string, Food> = {
  avena: { p: 13, c: 60, f: 7, min: 30, max: 150 },
  arroz: { p: 7, c: 78, f: 0.6, min: 40, max: 220 },
  pasta: { p: 12, c: 71, f: 1.5, min: 40, max: 220 },
  patata: { p: 2, c: 17, f: 0.1, min: 100, max: 700 },
  pan: { p: 9, c: 41, f: 3.5, min: 30, max: 160 },
  platano: { p: 1.1, c: 23, f: 0.3, unitGrams: 120, min: 1, max: 3 },
  pollo: { p: 23, c: 0, f: 1.5, min: 80, max: 350 },
  ternera: { p: 21, c: 0, f: 5, min: 80, max: 350 },
  merluza: { p: 18, c: 0, f: 1.5, min: 100, max: 400 },
  salmon: { p: 20, c: 0, f: 13, min: 80, max: 300 },
  huevo: { p: 12.6, c: 1, f: 10, unitGrams: 60, min: 1, max: 5 },
  yogur: { p: 10, c: 4, f: 0.2, min: 120, max: 500 },
  pavo: { p: 20, c: 1, f: 2, min: 30, max: 150 },
  pavoFresco: { p: 22, c: 0, f: 1, min: 80, max: 350 },
  leche: { p: 3.3, c: 4.8, f: 1.6, min: 0, max: 0 },
  verdura: { p: 2, c: 5, f: 0.3, min: 0, max: 0 },
  aceite: { p: 0, c: 0, f: 100, min: 0, max: 30 },
  frutos: { p: 20, c: 15, f: 50, min: 0, max: 50 },
};

interface MealDef { titleKey: StringKey; carb: string; protein: string; fat?: string; fixed?: [food: string, grams: number][] }
interface Macro3 { p: number; c: number; f: number }

// Rota los alimentos principales para que la semana no sea siempre igual.
const rot = <T,>(list: T[], day: number) => list[day % list.length];
// lean: en definición se evitan las proteínas grasas para no pasarse de grasa.
const MEALS = {
  desayuno: (_d: number, _lean: boolean): MealDef => ({ titleKey: 'plan.breakfast', carb: 'avena', protein: 'huevo', fixed: [['leche', 250]] }),
  mediaManana: (_d: number, _lean: boolean): MealDef => ({ titleKey: 'plan.midMorning', carb: 'pan', protein: 'pavo', fat: 'frutos' }),
  comida: (d: number, _lean: boolean): MealDef => ({ titleKey: 'plan.lunch', carb: rot(['arroz', 'pasta', 'patata'], d), protein: rot(['pollo', 'ternera', 'merluza'], d), fat: 'aceite', fixed: [['verdura', 200]] }),
  merienda: (_d: number, _lean: boolean): MealDef => ({ titleKey: 'plan.snack', carb: 'pan', protein: 'pavo', fat: 'frutos' }),
  pre: (_d: number, _lean: boolean): MealDef => ({ titleKey: 'plan.pre', carb: 'platano', protein: 'yogur' }),
  cena: (d: number, lean: boolean): MealDef => ({
    titleKey: 'plan.dinner',
    carb: rot(['patata', 'arroz', 'pasta'], d + 1),
    protein: rot(lean ? ['merluza', 'pollo', 'pavoFresco'] : ['merluza', 'pollo', 'salmon'], d + 1),
    fat: 'aceite',
    fixed: [['verdura', 200]],
  }),
};

const macrosOf = (food: Food, grams: number): Macro3 => ({ p: (food.p * grams) / 100, c: (food.c * grams) / 100, f: (food.f * grams) / 100 });
const add = (a: Macro3, b: Macro3): Macro3 => ({ p: a.p + b.p, c: a.c + b.c, f: a.f + b.f });

function portion(food: Food, gramsNeeded: number, t: Translate) {
  if (food.unitGrams) {
    const units = Math.min(food.max, Math.max(food.min, Math.round(gramsNeeded / food.unitGrams)));
    return { grams: units * food.unitGrams, label: `${units} ${t(units === 1 ? 'plan.unit' : 'plan.units')}` };
  }
  const step = gramsNeeded >= 100 ? 10 : 5;
  const grams = Math.min(food.max, Math.max(food.min, Math.round(gramsNeeded / step) * step));
  return { grams, label: `${grams} g` };
}

// Carbohidrato → proteína → grasa, restando lo que ya aporta cada alimento anterior.
// lowercase: en el subtítulo los alimentos van en minúscula, salvo en alemán (sustantivos con mayúscula).
function scaleMeal(def: MealDef, target: Macro3, t: Translate, lowercase: boolean) {
  const name = (key: string) => t(`food.${key}` as StringKey);
  const items: { name: string; quantity: string }[] = [];
  let got: Macro3 = { p: 0, c: 0, f: 0 };
  for (const [key, grams] of def.fixed ?? []) {
    got = add(got, macrosOf(F[key], grams));
    items.push({ name: name(key), quantity: key === 'leche' ? `${grams} ml` : `${grams} g` });
  }
  const carb = F[def.carb];
  const c = portion(carb, ((target.c - got.c) / carb.c) * 100, t);
  got = add(got, macrosOf(carb, c.grams));
  const protein = F[def.protein];
  const p = portion(protein, ((target.p - got.p) / protein.p) * 100, t);
  got = add(got, macrosOf(protein, p.grams));
  items.unshift({ name: name(def.protein), quantity: p.label });
  items.unshift({ name: name(def.carb), quantity: c.label });
  if (def.fat) {
    const fat = F[def.fat];
    const needed = ((target.f - got.f) / fat.f) * 100;
    if (needed >= 5) {
      const f = portion(fat, needed, t);
      got = add(got, macrosOf(fat, f.grams));
      items.push({ name: name(def.fat), quantity: f.label });
    }
  }
  const subtitle = [def.carb, def.protein]
    .map((k) => {
      const short = name(k).replace(/ \(.*\)$/, '');
      return lowercase ? short.toLowerCase() : short;
    })
    .join(' + ');
  return { items, subtitle, got };
}

// ── Horario ──
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const fromMin = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; };
const round15 = (m: number) => Math.round(m / 15) * 15;

// Todas las horas en "minutos del día de la persona": lo que cae antes de despertarse se cuenta como +24 h.
export function personDay(wakeTime: string) {
  const wake = toMin(wakeTime);
  return (t: string) => { const x = toMin(t); return x < wake ? x + 1440 : x; };
}

type Interval = [start: number, end: number];

export interface DaySchedule {
  dow: number;
  gym: Interval | null;
  sport: Interval | null;
  commitment: Interval | null;
}

// Margen para ir y volver entre clase/trabajo y el gimnasio, y para no juntar gimnasio y deporte.
const COMMIT_GAP = 30;
const SPORT_GAP = 60;
const WEEK = [1, 2, 3, 4, 5, 6, 0];

const overlaps = (a: Interval, b: Interval, gap = 0) => a[0] < b[1] + gap && b[0] < a[1] + gap;

// Recorre ideal, ideal ∓ 15, ideal ∓ 30... y devuelve la primera hora dentro de [min, max] que acepte `ok`.
function nearest(ideal: number, min: number, max: number, ok: (t: number) => boolean) {
  for (let k = 0; k * 15 <= 1440; k++) {
    for (const t of k === 0 ? [ideal] : [ideal - k * 15, ideal + k * 15]) {
      if (t >= min && t <= max && ok(t)) return t;
    }
  }
  return null;
}

function* combinations<T>(items: T[], k: number, from = 0, acc: T[] = []): Generator<T[]> {
  if (acc.length === k) {
    yield acc;
    return;
  }
  for (let i = from; i <= items.length - (k - acc.length); i++) yield* combinations(items, k, i + 1, [...acc, items[i]]);
}

// Elige los días de gimnasio y la hora de cada uno: lo más cerca posible de la hora preferida, sin pisar
// la clase/trabajo ni el otro deporte. Evita, por este orden de peso, juntar gimnasio y deporte el mismo día,
// el domingo y los días seguidos. gymDaysMissing > 0 si con ese horario no caben todos los días pedidos.
export function weekSchedule(a: OnboardingAnswers): { days: DaySchedule[]; gymDaysMissing: number } {
  const dayMin = personDay(a.wake_time);
  const wake = toMin(a.wake_time);
  const sleep = dayMin(a.sleep_time);
  const preferred = dayMin(a.training_time);

  const base = WEEK.map((dow): DaySchedule => {
    const c = a.commitments.find((x) => x.day === dow);
    const sportStart = a.sport?.days.includes(dow) ? dayMin(a.sport.start) : null;
    return {
      dow,
      gym: null,
      sport: sportStart != null ? [sportStart, sportStart + a.sport!.minutes] : null,
      commitment: c ? [dayMin(c.start), dayMin(c.end)] : null,
    };
  });

  const options = new Map<number, number>();
  for (const d of base) {
    const start = nearest(preferred, wake + 15, sleep - 30 - a.session_minutes, (t) => {
      const slot: Interval = [t, t + a.session_minutes];
      return !(d.commitment && overlaps(slot, d.commitment, COMMIT_GAP)) && !(d.sport && overlaps(slot, d.sport, SPORT_GAP));
    });
    if (start != null) options.set(d.dow, start);
  }

  const feasible = WEEK.filter((dow) => options.has(dow));
  const n = Math.min(a.gym_days, feasible.length);
  const cost = (set: number[]) =>
    set.reduce((c, dow) => {
      c += Math.abs(options.get(dow)! - preferred) / 60;
      if (a.sport?.days.includes(dow)) c += 6;
      if (dow === 0) c += 3;
      if (set.includes((dow + 1) % 7)) c += 2;
      return c;
    }, 0);

  let best: number[] = [];
  let bestCost = Infinity;
  for (const set of combinations(feasible, n)) {
    const c = cost(set);
    if (c < bestCost) {
      best = set;
      bestCost = c;
    }
  }

  const days = base.map((d) => {
    const start = best.includes(d.dow) ? options.get(d.dow)! : null;
    return { ...d, gym: start != null ? ([start, start + a.session_minutes] as Interval) : null };
  });
  return { days, gymDaysMissing: a.gym_days - n };
}

// role: comida principal que hace de pre/post-entreno, o tentempié post-entreno.
type MealSlot = { meal: keyof typeof MEALS; at: number; weight: number; role?: 'pre' | 'post' | 'postSnack'; takeaway?: boolean };

// Coloca las comidas del día alrededor de las sesiones (gimnasio y/o deporte) y de la clase/trabajo.
// weight es el peso relativo de cada comida en los macros del día.
function daySlots(sessions: Interval[], commitment: Interval | null, wake: number, sleep: number): MealSlot[] {
  const latest = sleep - 45; // última comida como tarde 45 min antes de dormir
  const inSession = (t: number) => sessions.some(([s, e]) => t >= s && t < e);
  // Ninguna comida principal desde 1 h antes de entrenar hasta 15 min después de acabar.
  const nearSession = (t: number) => sessions.some(([s, e]) => t > s - 60 && t < e + 15);
  const inCommitment = (t: number) => !!commitment && t > commitment[0] && t < commitment[1];

  // Una comida principal sale de la clase/trabajo si basta con moverla hora y media como mucho;
  // si no, se queda a su hora y se come allí (para llevar). Los tentempiés nunca se mueven por eso.
  const place = (ideal: number, min: number, max: number, blocked: (t: number) => boolean) => {
    const at = round15(ideal);
    return (
      nearest(at, Math.max(min, at - 90), Math.min(max, at + 90), (t) => !blocked(t) && !inCommitment(t)) ??
      nearest(at, min, max, (t) => !blocked(t))
    );
  };
  // Si no cabe con 2,5 h entre comidas, se relaja la separación antes que comer en mitad de una sesión.
  const placeMain = (ideal: number, min: number, max: number) =>
    place(ideal, min, max, nearSession) ??
    place(ideal, min, max, inSession) ??
    nearest(round15(ideal), wake + 15, latest, (t) => !inSession(t)) ??
    round15(ideal);

  const desayuno = placeMain(wake + 30, wake + 15, latest - 300);
  const comida = placeMain(Math.max(toMin('14:00'), desayuno + 240), desayuno + 150, latest - 150);
  const cena = placeMain(Math.min(toMin('21:00'), latest), comida + 150, latest);
  const meals: MealSlot[] = [
    { meal: 'desayuno', at: desayuno, weight: 25 },
    { meal: 'comida', at: comida, weight: 30 },
    { meal: 'cena', at: cena, weight: sessions.length ? 25 : 30 },
  ];

  for (const m of meals) {
    if (sessions.some(([, e]) => m.at > e && m.at <= e + 120)) m.role = 'post';
    else if (sessions.some(([s]) => m.at >= s - 150 && m.at <= s - 45)) m.role = 'pre';
  }

  // Pre y post de cada sesión, salvo que ya haya una comida que haga ese papel.
  const hasMealIn = (from: number, to: number) => meals.some((m) => m.at >= from && m.at <= to);
  const snackBlocked = (t: number) => inSession(t) || meals.some((m) => Math.abs(m.at - t) < 60);
  for (const [s, e] of [...sessions].sort((x, y) => x[0] - y[0])) {
    if (!hasMealIn(s - 150, s - 30) && s - 30 >= wake + 10) {
      const at = nearest(s - 75, Math.max(wake + 10, s - 120), s - 30, (t) => !snackBlocked(t));
      if (at != null) meals.push({ meal: 'pre', at, weight: 10 });
    }
    if (!hasMealIn(e + 1, e + 120) && e + 30 <= latest) {
      const at = nearest(e + 30, e + 15, Math.min(e + 90, latest), (t) => !snackBlocked(t));
      if (at != null) meals.push({ meal: 'merienda', at, weight: 10, role: 'postSnack' });
    }
  }

  // Si faltan tentempiés, van en el hueco más largo entre comidas (sin pisar ninguna sesión).
  const wanted = sessions.length ? 2 : 1;
  for (let snacks = meals.length - 3; snacks < wanted; snacks++) {
    const times = meals.map((m) => m.at).sort((x, y) => x - y);
    let at: number | null = null;
    let bestGap = 0;
    for (let i = 1; i < times.length; i++) {
      const gap = times[i] - times[i - 1];
      if (gap < 180 || gap <= bestGap) continue;
      const t = nearest(round15((times[i] + times[i - 1]) / 2), times[i - 1] + 60, times[i] - 60, (x) => !inSession(x));
      if (t != null) {
        at = t;
        bestGap = gap;
      }
    }
    if (at == null) break;
    meals.push({ meal: at < toMin('12:30') ? 'mediaManana' : 'merienda', at, weight: sessions.length ? 10 : 15 });
  }

  for (const m of meals) m.takeaway = inCommitment(m.at);
  return meals;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildDefaultPlan(a: OnboardingAnswers, m: MacroReference, lang: Lang = 'es'): { days: PlanDay[] } {
  const t = translator(lang);
  const { days: week } = weekSchedule(a);
  const split = SPLITS[a.gym_days];
  const dayMin = personDay(a.wake_time);
  const wake = toMin(a.wake_time);
  const sleep = dayMin(a.sleep_time);
  const gymOrder = week.filter((d) => d.gym).map((d) => d.dow);
  const sportName = a.sport ? capitalize(knownLabel(t, 'ob.sport', a.sport.name.trim())) : '';

  const days: PlanDay[] = week.map((d) => {
    const workoutKey = d.gym ? split[gymOrder.indexOf(d.dow)] : null;
    const raw: Omit<PlanBlock, 'sort_order'>[] = [
      { time: fromMin(wake), category: 'rest', title: t('plan.wake'), subtitle: '', exercises: [], meal_items: [] },
    ];

    if (d.commitment) {
      raw.push({
        time: fromMin(d.commitment[0]),
        category: 'rest',
        title: knownLabel(t, 'ob.commitment', a.commitment_label),
        subtitle: t('plan.until', { time: fromMin(d.commitment[1]) }),
        exercises: [],
        meal_items: [],
      });
    }
    if (d.gym && workoutKey) {
      const w = WORKOUTS[workoutKey];
      raw.push({
        time: fromMin(d.gym[0]),
        category: 'train',
        title: `${t('plan.gym')} · ${t(`workout.${workoutKey}` as StringKey)}`,
        subtitle: t('plan.gymSubtitle', { n: w.exercises.length, minutes: a.session_minutes }),
        exercises: buildExercises(workoutKey, a.level, t),
        meal_items: [],
      });
    }
    if (d.sport && a.sport) {
      raw.push({ time: fromMin(d.sport[0]), category: 'train', title: sportName, subtitle: t('common.minutes', { n: a.sport.minutes }), exercises: [], meal_items: [] });
    }

    const sessions = [d.gym, d.sport].filter((x): x is Interval => x != null);
    const slots = daySlots(sessions, d.commitment, wake, sleep);
    const totalWeight = slots.reduce((sum, s) => sum + s.weight, 0);
    for (const slot of slots) {
      const share = slot.weight / totalWeight;
      const def = MEALS[slot.meal](d.dow, a.goal === 'fat_loss');
      const meal = scaleMeal(def, { p: m.protein_g * share, c: m.carbs_g * share, f: m.fat_g * share }, t, lang !== 'de');
      const base = slot.role === 'postSnack' ? t('plan.post') : t(def.titleKey);
      const suffix = slot.role === 'pre' ? t('plan.preSuffix') : slot.role === 'post' ? t('plan.postSuffix') : null;
      raw.push({
        time: fromMin(slot.at),
        category: 'meal',
        title: [base, suffix, slot.takeaway ? t('plan.takeaway') : null].filter(Boolean).join(' · '),
        subtitle: meal.subtitle,
        exercises: [],
        meal_items: meal.items.map((it, i) => ({ ...it, sort_order: i + 1 })),
      });
    }

    const lastSessionEnd = Math.max(0, ...sessions.map((s) => s[1]));
    if (lastSessionEnd <= sleep - 60) {
      raw.push({ time: fromMin(sleep - 60), category: 'rest', title: t('plan.unwind'), subtitle: t('plan.noScreens'), exercises: [], meal_items: [] });
    }
    raw.push({ time: fromMin(sleep), category: 'rest', title: t('plan.sleep'), subtitle: '', exercises: [], meal_items: [] });

    const blocks = raw
      .sort((x, y) => dayMin(x.time) - dayMin(y.time))
      .map((b, i) => ({ ...b, sort_order: i + 1 }));

    const label = [workoutKey ? `${t(`workout.${workoutKey}` as StringKey)} · ${t('plan.gym')}` : null, d.sport ? sportName : null].filter(Boolean).join(' + ');
    return { day_of_week: d.dow, label: label || t('plan.rest'), accent_color: dayAccents[d.dow], blocks };
  });

  return { days };
}
