export type BlockCategory = 'meal' | 'train' | 'rest';

export type Goal = 'muscle' | 'fat_loss' | 'performance' | 'maintain';
export type Sex = 'male' | 'female';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type DailyActivity = 'sedentary' | 'light' | 'active';

// Otro deporte aparte del gimnasio: mismos días y hora cada semana.
export interface SportAnswer {
  name: string;
  days: number[]; // 0 = domingo ... 6 = sábado
  start: string; // "HH:MM"
  minutes: number;
}

// Un tramo fijo del día que no se puede mover (clase o trabajo).
export interface Commitment {
  day: number;
  start: string;
  end: string;
}

export interface OnboardingAnswers {
  sex: Sex;
  age: number;
  height_cm: number;
  weight_kg: number;
  body_fat_pct: number | null;
  goal: Goal;
  // kg por semana, siempre positivo; el signo lo da el objetivo. 0 si mantener o rendimiento.
  weekly_rate_kg: number;
  daily_activity: DailyActivity;
  gym_days: number;
  training_time: string; // "HH:MM", hora preferida de inicio del entreno; se mueve si choca con algo
  session_minutes: number;
  level: Level;
  wake_time: string;
  sleep_time: string;
  sport: SportAnswer | null;
  commitment_label: string; // "Clase", "Trabajo"...
  commitments: Commitment[];
}

export interface RoutineDay {
  id: string;
  user_id: string;
  day_of_week: number; // 0 = domingo ... 6 = sábado
  label: string;
  accent_color: string;
}

export interface RoutineBlock {
  id: string;
  routine_day_id: string;
  time: string; // "08:30"
  category: BlockCategory;
  title: string;
  subtitle: string | null;
  sort_order: number;
}

export interface Exercise {
  id: string;
  routine_block_id: string;
  name: string;
  target_display: string; // "4×5"
  sets_count: number;
  sort_order: number;
  note: string | null;
}

export interface MealItem {
  id: string;
  routine_block_id: string;
  name: string;
  quantity: string;
  sort_order: number;
}

export interface ExerciseSetLog {
  id: string;
  user_id: string;
  exercise_id: string;
  date: string; // YYYY-MM-DD
  set_index: number;
  weight: number | null;
}

export interface MacroTargets {
  user_id: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  potassium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  vitamin_d_mcg: number;
}

// Recomendación calculada al generar el plan (supabase/functions/generate-plan): se muestra al editar.
export type MacroReference = Omit<MacroTargets, 'user_id'> & {
  maintenance_calories: number;
  why: string[];
};

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
}

export interface TrainingLogEntry {
  id: string;
  user_id: string;
  date: string;
  trained: boolean;
}
