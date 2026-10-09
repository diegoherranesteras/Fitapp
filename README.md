# Rutina — tu semana de entreno y comida, montada sola

App móvil y web (Expo + Supabase) que, a partir de un cuestionario, construye una **semana completa**: días y hora de gimnasio, sesiones de tu otro deporte, clase o trabajo, y todas las comidas con cantidades cuadradas a tus macros. Después registras pesos por serie, comidas y peso corporal, y ves tu progreso.

Funciona igual en el móvil (iOS/Android con Expo) y en el ordenador (web), con un diseño adaptado a cada uno: pestañas abajo y hojas deslizantes en el móvil; barra lateral, semana entera en 7 columnas y diálogos centrados en el ordenador.

## Qué hace

**Cuestionario de bienvenida (6 pasos)**
- Datos físicos, % de grasa opcional y objetivo (ganar músculo, perder grasa, mantener, rendir), con el ritmo semanal y un aviso en vivo si es demasiado rápido.
- Horario: a qué hora te levantas y te acuestas, y tus horas de clase o trabajo por día.
- Otro deporte (boxeo, fútbol, pádel…): qué días, a qué hora y cuánto dura.
- Gimnasio: días por semana, hora preferida, duración y nivel, con una vista previa de qué días y a qué hora quedaría.
- Resumen de la semana y de los macros, con la explicación de cada número.

**Plan automático** (`lib/default-plan.ts`)
- Elige los días de gimnasio probando todas las combinaciones y puntuándolas: evita juntar gimnasio y deporte el mismo día, el domingo y los días seguidos; la hora se mueve lo justo si choca con clase o deporte.
- Coloca las comidas alrededor de todo: ninguna comida principal en la hora antes de entrenar, pre-entreno y post-entreno cuando hacen falta, y las comidas que caen en clase se marcan «para llevar».
- Escala cada comida (carbohidrato → proteína → grasa) para que el día cuadre con los macros. Probado con más de 4.000 combinaciones de horarios.

**Macros con base científica** (`lib/nutrition.ts`): Mifflin-St Jeor o Katch-McArdle según el % de grasa, actividad diaria + gimnasio + horas del otro deporte, proteína por kg de masa magra o de peso, y ritmos de cambio según la literatura (Helms 2014, Iraki 2019, ISSN).

**Rutina editable**: modo edición para cambiar hora, título o tipo de cualquier bloque; cambiar ejercicios desde una biblioteca de más de 100 (con un bloque de potencia orientado a deportes de combate), ajustar series y repeticiones, reordenar, añadir o borrar; editar alimentos y cantidades.

**Registro y progreso**: pesos por serie con la referencia de la última sesión, comidas libres, peso corporal en kg o lb, gráfica de peso y calendario anual de días entrenados.

## Stack

| | |
| --- | --- |
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript estricto, Expo Router |
| Web | react-native-web (misma base de código) |
| Animación | Reanimated 4 (transiciones CSS en el hilo de UI) |
| Backend | Supabase: Postgres, Auth, Row Level Security por usuario, función RPC atómica para guardar el plan |
| Diseño | Paleta propia oscura con acentos de neón; principios de diseño de interacción de Emil Kowalski |

## Arquitectura

```
app/                 pantallas (Expo Router)
  onboarding.tsx     cuestionario
  (tabs)/            Rutina, Macros, Progreso, Perfil + navegación adaptable
components/          Sheet (hoja/diálogo adaptable), BlockEditor, ExerciseSheet…
lib/
  default-plan.ts    generador del plan semanal (lógica pura, testeable)
  nutrition.ts       cálculo de macros
  exercise-library.ts biblioteca de ejercicios
supabase/
  schema.sql         tablas + RLS
  migrations/        002 cuestionario y RPC del plan · 003 historial de series
  functions/         generación del plan con IA (en preparación)
```

Decisiones a destacar:
- **Seguridad en la base de datos, no en la app**: cada tabla tiene RLS; la RPC `apply_generated_plan` es `security invoker`, así que también respeta RLS, y guarda el plan entero o nada.
- **El historial no depende del plan**: cada serie guarda el nombre del ejercicio, así rehacer el plan o cambiar un ejercicio no borra tus marcas.
- **Lógica pura separada de la UI**: el generador del plan y el cálculo de macros no importan nada de React, lo que permite probarlos con miles de combinaciones.

## Arrancarlo

1. `npm install`
2. Copia `.env.example` a `.env` y pon la URL y la anon key de tu proyecto de Supabase.
3. En el SQL Editor de Supabase ejecuta, en orden: `supabase/schema.sql`, `supabase/migrations/002_onboarding.sql`, `supabase/migrations/003_set_history.sql`.
4. `npm run web` (ordenador) o `npm start` y escanea el QR con Expo Go (móvil).

## Próximos pasos

- Generar rutinas específicas del deporte con IA (Claude) mediante la Edge Function ya preparada.
- Buscador de alimentos y registro de comidas del plan con un toque.
- Biblioteca de ejercicios en la base de datos, con vídeos y técnica.
