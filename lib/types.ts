export type BlockCategory = 'meal' | 'train' | 'rest';

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
