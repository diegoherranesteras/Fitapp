import type { Goal, MacroReference, OnboardingAnswers } from './types';

// Referencias usadas:
// - Gasto basal: Mifflin-St Jeor; Katch-McArdle si se conoce el % de grasa (usa la masa magra).
// - Ritmo: ganar 0,1-0,5 % del peso/semana (Iraki et al., 2019); perder 0,5-1 % (Helms et al., 2014).
// - Proteína: ISSN, 1,6-2,2 g/kg en superávit y 2,3-3,1 g/kg de masa magra en déficit.
// - Grasa: 20-35 % de las calorías (ACSM), nunca por debajo de ~0,7 g/kg.
const KCAL_PER_KG = 7700;

export type RateLevel = 'slow' | 'ideal' | 'fast' | 'too_fast';

export interface RateFeedback {
  level: RateLevel;
  pctPerWeek: number;
  monthlyKg: number;
  message: string;
}

const RATE_BANDS: Record<'muscle' | 'fat_loss', { max: number; level: RateLevel; message: string }[]> = {
  muscle: [
    { max: 0.1, level: 'slow', message: 'Muy lento: apenas vas a notar cambios.' },
    { max: 0.5, level: 'ideal', message: 'Ritmo ideal: ganas músculo con la mínima grasa.' },
    { max: 0.75, level: 'fast', message: 'Rápido: parte de lo que ganes será grasa.' },
    { max: Infinity, level: 'too_fast', message: 'Demasiado: vas a ganar mucha grasa. El músculo no crece tan rápido.' },
  ],
  fat_loss: [
    { max: 0.25, level: 'slow', message: 'Lento: muy llevadero, pero tardarás en ver resultados.' },
    { max: 1.0, level: 'ideal', message: 'Ritmo ideal: pierdes grasa manteniendo el músculo.' },
    { max: 1.5, level: 'fast', message: 'Agresivo: riesgo de perder músculo y rendir peor.' },
    { max: Infinity, level: 'too_fast', message: 'Demasiado: perderás músculo y lo vas a pasar mal.' },
  ],
};

export function goalHasRate(goal: Goal): goal is 'muscle' | 'fat_loss' {
  return goal === 'muscle' || goal === 'fat_loss';
}

export function rateFeedback(goal: 'muscle' | 'fat_loss', rateKg: number, weightKg: number): RateFeedback {
  const pctPerWeek = (rateKg / weightKg) * 100;
  const band = RATE_BANDS[goal].find((b) => pctPerWeek < b.max)!;
  return { level: band.level, pctPerWeek, monthlyKg: rateKg * 4.3, message: band.message };
}

export function recommendedRate(goal: 'muscle' | 'fat_loss', weightKg: number) {
  const pct = goal === 'muscle' ? 0.0035 : 0.007;
  return Math.max(0.05, Math.round((weightKg * pct) / 0.05) * 0.05);
}

const PROTEIN = {
  // g por kg de masa magra (si hay % de grasa) y g por kg de peso total (si no)
  muscle: { lean: 2.4, total: 2.0 },
  fat_loss: { lean: 2.6, total: 2.2 },
  performance: { lean: 2.2, total: 1.8 },
  maintain: { lean: 2.2, total: 1.8 },
} as const;

const FAT_PCT = { muscle: 0.25, fat_loss: 0.25, performance: 0.22, maintain: 0.28 } as const;

const ACTIVITY_BASE = { sedentary: 1.2, light: 1.35, active: 1.5 } as const;

const fmt = (n: number, decimals = 0) => n.toLocaleString('es-ES', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });

export function computeMacros(a: OnboardingAnswers): MacroReference {
  const leanMass = a.body_fat_pct != null ? a.weight_kg * (1 - a.body_fat_pct / 100) : null;
  const bmr = leanMass != null
    ? 370 + 21.6 * leanMass
    : 10 * a.weight_kg + 6.25 * a.height_cm - 5 * a.age + (a.sex === 'male' ? 5 : -161);
  // Cada día de gimnasio (~1 h) suma 0,07 al factor de actividad; el otro deporte suma por horas semanales,
  // un poco más por hora porque suele ser más continuo (boxeo, fútbol, correr...).
  const sportHours = a.sport ? (a.sport.days.length * a.sport.minutes) / 60 : 0;
  const activity = Math.min(1.9, ACTIVITY_BASE[a.daily_activity] + 0.07 * a.gym_days + 0.06 * sportHours);
  const maintenance = Math.round(bmr * activity);

  let delta = 0;
  if (a.goal === 'muscle') delta = Math.round((a.weekly_rate_kg * KCAL_PER_KG) / 7);
  if (a.goal === 'fat_loss') delta = -Math.round((a.weekly_rate_kg * KCAL_PER_KG) / 7);
  if (a.goal === 'performance') delta = Math.round(maintenance * 0.05);

  const floor = a.sex === 'male' ? 1500 : 1200;
  const unclamped = Math.round((maintenance + delta) / 10) * 10;
  const calories = Math.max(floor, unclamped);

  const p = PROTEIN[a.goal];
  const protein_g = Math.round(leanMass != null ? leanMass * p.lean : a.weight_kg * p.total);
  const fat_g = Math.max(Math.round((calories * FAT_PCT[a.goal]) / 9), Math.round(a.weight_kg * 0.7));
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));

  const why: string[] = [
    `Tu gasto estimado es de unas ${fmt(maintenance)} kcal al día (${
      leanMass != null ? 'fórmula de Katch-McArdle con tu % de grasa' : 'fórmula de Mifflin-St Jeor'
    }, ajustada a tu actividad, ${a.gym_days} ${a.gym_days === 1 ? 'día' : 'días'} de gimnasio${
      a.sport ? ` y ${fmt(sportHours, 1)} h semanales de ${a.sport.name.trim().toLowerCase()}` : ''
    }).`,
  ];
  if (a.goal === 'muscle') {
    why.push(`Para ganar ${fmt(a.weekly_rate_kg, 2)} kg por semana comes ${fmt(delta)} kcal por encima de tu gasto.`);
  } else if (a.goal === 'fat_loss') {
    why.push(`Para perder ${fmt(a.weekly_rate_kg, 2)} kg por semana comes ${fmt(-delta)} kcal por debajo de tu gasto.`);
  } else if (a.goal === 'performance') {
    why.push('Ligero superávit del 5 % para rendir y recuperar entre sesiones.');
  } else {
    why.push('Calorías de mantenimiento: mismo peso, mejor composición con el entreno.');
  }
  if (calories !== unclamped) {
    why.push(`Hemos subido las calorías a ${fmt(floor)}: por debajo no es seguro sin supervisión.`);
  }
  why.push(
    leanMass != null
      ? `Proteína: ${fmt(p.lean, 1)} g por kg de masa magra (${fmt(leanMass, 1)} kg).${a.goal === 'fat_loss' ? ' En déficit se sube para proteger el músculo.' : ''}`
      : `Proteína: ${fmt(p.total, 1)} g por kg de peso.${a.goal === 'fat_loss' ? ' En déficit se sube para proteger el músculo.' : ''}`,
  );
  why.push(
    `Grasa al ${Math.round(FAT_PCT[a.goal] * 100)} % de las calorías para tus hormonas; el resto, carbohidrato, que es el combustible del entreno.`,
  );

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g: Math.round((calories / 1000) * 14),
    sodium_mg: a.gym_days >= 4 ? 2800 : 2300,
    potassium_mg: a.sex === 'male' ? 3400 : 2600,
    calcium_mg: a.age < 19 ? 1300 : 1000,
    iron_mg: a.sex === 'male' ? 8 : 18,
    vitamin_d_mcg: 15,
    maintenance_calories: maintenance,
    why,
  };
}
