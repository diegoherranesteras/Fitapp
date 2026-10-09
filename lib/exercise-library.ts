// Biblioteca de ejercicios para cambiar o añadir ejercicios a la rutina.
// sets/reps son la propuesta por defecto al añadirlo; luego se ajustan en el editor.

export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Hombro'
  | 'Bíceps'
  | 'Tríceps'
  | 'Cuádriceps'
  | 'Femoral y glúteo'
  | 'Gemelo'
  | 'Core'
  | 'Potencia'
  | 'Cardio';

export interface LibraryExercise {
  name: string;
  group: MuscleGroup;
  equipment: 'Barra' | 'Mancuernas' | 'Polea' | 'Máquina' | 'Peso corporal' | 'Kettlebell' | 'Balón medicinal' | 'Otro';
  sets: number;
  reps: string;
}

const ex = (group: MuscleGroup, equipment: LibraryExercise['equipment'], sets: number, reps: string, ...names: string[]) =>
  names.map((name): LibraryExercise => ({ name, group, equipment, sets, reps }));

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  ...ex('Pecho', 'Barra', 4, '6-8', 'Press banca', 'Press inclinado con barra', 'Press banca agarre cerrado'),
  ...ex('Pecho', 'Mancuernas', 3, '8-10', 'Press inclinado con mancuernas', 'Press plano con mancuernas', 'Aperturas con mancuernas'),
  ...ex('Pecho', 'Polea', 3, '12-15', 'Aperturas en polea', 'Cruce de poleas bajo'),
  ...ex('Pecho', 'Máquina', 3, '10-12', 'Press en máquina', 'Contractor de pecho'),
  ...ex('Pecho', 'Peso corporal', 3, '8-12', 'Fondos', 'Flexiones', 'Flexiones con palmada'),

  ...ex('Espalda', 'Peso corporal', 4, '6-10', 'Dominadas', 'Dominadas supinas', 'Remo invertido'),
  ...ex('Espalda', 'Barra', 4, '6-8', 'Remo con barra', 'Remo Pendlay', 'Peso muerto'),
  ...ex('Espalda', 'Mancuernas', 3, '8-10', 'Remo con mancuerna a una mano', 'Remo en banco inclinado'),
  ...ex('Espalda', 'Polea', 3, '10-12', 'Jalón al pecho', 'Jalón agarre estrecho', 'Remo en polea', 'Pullover en polea', 'Dominadas o jalón al pecho'),
  ...ex('Espalda', 'Máquina', 3, '10-12', 'Remo en máquina', 'Jalón en máquina'),

  ...ex('Hombro', 'Barra', 4, '6-8', 'Press militar', 'Push press'),
  ...ex('Hombro', 'Mancuernas', 3, '10-12', 'Press Arnold', 'Press de hombro con mancuernas', 'Elevaciones laterales', 'Pájaros', 'Elevaciones frontales'),
  ...ex('Hombro', 'Polea', 3, '15', 'Face pulls', 'Elevación lateral en polea'),
  ...ex('Hombro', 'Otro', 3, '8/lado', 'Landmine press', 'Rotación externa con banda'),

  ...ex('Bíceps', 'Barra', 3, '10-12', 'Curl con barra', 'Curl con barra Z'),
  ...ex('Bíceps', 'Mancuernas', 3, '10-12', 'Curl de bíceps', 'Curl martillo', 'Curl inclinado', 'Curl concentrado'),
  ...ex('Bíceps', 'Polea', 3, '12', 'Curl en polea', 'Curl bayesiano'),

  ...ex('Tríceps', 'Polea', 3, '10-12', 'Extensión de tríceps en polea', 'Extensión por encima de la cabeza en polea'),
  ...ex('Tríceps', 'Barra', 3, '10-12', 'Press francés'),
  ...ex('Tríceps', 'Mancuernas', 3, '10-12', 'Patada de tríceps', 'Extensión de tríceps con mancuerna'),

  ...ex('Cuádriceps', 'Barra', 4, '6-8', 'Sentadilla', 'Sentadilla frontal', 'Sentadilla trasera'),
  ...ex('Cuádriceps', 'Máquina', 3, '10-12', 'Prensa', 'Extensión de cuádriceps', 'Hack squat'),
  ...ex('Cuádriceps', 'Mancuernas', 3, '8-10/lado', 'Sentadilla búlgara', 'Zancadas', 'Step-up', 'Sentadilla goblet'),
  ...ex('Cuádriceps', 'Peso corporal', 3, '10/lado', 'Zancada con rotación', 'Sentadilla con salto'),

  ...ex('Femoral y glúteo', 'Barra', 3, '8-10', 'Peso muerto rumano', 'Hip thrust', 'Buenos días'),
  ...ex('Femoral y glúteo', 'Máquina', 3, '10-12', 'Curl femoral', 'Curl femoral sentado', 'Abductores'),
  ...ex('Femoral y glúteo', 'Mancuernas', 3, '10/lado', 'Peso muerto a una pierna', 'Puente de glúteo a una pierna'),
  ...ex('Femoral y glúteo', 'Peso corporal', 3, '6-8', 'Nordic curl'),

  ...ex('Gemelo', 'Máquina', 4, '12-15', 'Elevación de gemelos', 'Gemelos sentado', 'Gemelos'),

  ...ex('Core', 'Peso corporal', 3, '30-45 s', 'Plancha', 'Plancha lateral', 'Plancha con rotación (core)', 'Hollow hold'),
  ...ex('Core', 'Peso corporal', 3, '10-15', 'Elevación de piernas colgado', 'Rueda abdominal', 'Dead bug'),
  ...ex('Core', 'Polea', 3, '10/lado', 'Pallof press', 'Leñador en polea'),
  ...ex('Core', 'Balón medicinal', 3, '10/lado', 'Giros rusos con balón'),

  // Potencia: lo que más se traslada al golpeo (cadera explosiva, rotación, empuje rápido).
  ...ex('Potencia', 'Kettlebell', 4, '15', 'Kettlebell swing (explosivo)', 'Kettlebell swing'),
  ...ex('Potencia', 'Balón medicinal', 4, '6/lado', 'Lanzamiento rotacional de balón medicinal', 'Lanzamiento de balón medicinal al pecho', 'Slam de balón medicinal'),
  ...ex('Potencia', 'Otro', 4, '6/lado', 'Landmine punch', 'Landmine rotacional'),
  ...ex('Potencia', 'Barra', 4, '3', 'Power clean', 'Hang clean', 'Jump squat con barra'),
  ...ex('Potencia', 'Peso corporal', 4, '5', 'Salto al cajón', 'Salto horizontal', 'Flexiones pliométricas'),

  ...ex('Cardio', 'Otro', 1, '10 min', 'Comba', 'Sombra (shadow boxing)', 'Bicicleta estática', 'Remo ergómetro', 'Cinta inclinada', 'Assault bike (intervalos)'),
];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Pecho',
  'Espalda',
  'Hombro',
  'Bíceps',
  'Tríceps',
  'Cuádriceps',
  'Femoral y glúteo',
  'Gemelo',
  'Core',
  'Potencia',
  'Cardio',
];

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function searchExercises(query: string, group: MuscleGroup | null) {
  const q = normalize(query.trim());
  return EXERCISE_LIBRARY.filter((e) => (!group || e.group === group) && (!q || normalize(e.name).includes(q)));
}

export function groupOf(name: string): MuscleGroup | null {
  return EXERCISE_LIBRARY.find((e) => e.name === name)?.group ?? null;
}
