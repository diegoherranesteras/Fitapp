// Supabase Edge Function: genera el plan semanal con Claude a partir de un cuestionario ampliado
// (deporte, clases/trabajo). Aún no está desplegada ni conectada: la app genera hoy el plan base
// sin IA en lib/default-plan.ts. Secreto necesario: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets).
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const MODEL = "claude-opus-5";
// El plan gratuito de Supabase corta la función a los 150 s: dejamos margen para validar y guardar.
const CLAUDE_TIMEOUT_MS = 120_000;
const RETRY_IF_ELAPSED_UNDER_MS = 55_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DAY_ACCENTS: Record<number, string> = {
  1: "#E2B24E", 2: "#E2954A", 3: "#E07C42", 4: "#DA5C3E", 5: "#D75E66", 6: "#CF7280", 0: "#9B897D",
};

// ── Entrada: respuestas del cuestionario (mantener sincronizado con lib/types.ts) ──
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const Time = z.string().regex(HHMM);
const Answers = z.object({
  goal: z.enum(["muscle", "fat_loss", "performance", "maintain"]),
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(14).max(90),
  height_cm: z.number().min(120).max(230),
  weight_kg: z.number().min(35).max(250),
  gym_days: z.number().int().min(1).max(6),
  session_minutes: z.number().int().min(30).max(150),
  preferred_time: z.enum(["morning", "midday", "afternoon", "evening"]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.enum(["gym", "home"]),
  sport: z.object({
    name: z.string().min(1).max(40),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    start: Time,
    minutes: z.number().int().min(15).max(240),
  }).nullable(),
  commitment_label: z.string().min(1).max(20),
  commitments: z.array(z.object({ day: z.number().int().min(0).max(6), start: Time, end: Time })).max(7),
  wake_time: Time,
  sleep_time: Time,
});
type Answers = z.infer<typeof Answers>;

// ── Salida de Claude: esquema compacto (plantillas + días que las referencian) ──
const PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "workouts", "meals", "days"],
  properties: {
    summary: { type: "string" },
    workouts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "subtitle", "exercises"],
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "target_display", "sets_count", "note"],
              properties: {
                name: { type: "string" },
                target_display: { type: "string" },
                sets_count: { type: "integer" },
                note: { type: "string" },
              },
            },
          },
        },
      },
    },
    meals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "title", "subtitle", "calories", "protein_g", "carbs_g", "fat_g", "items"],
        properties: {
          key: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          calories: { type: "integer" },
          protein_g: { type: "integer" },
          carbs_g: { type: "integer" },
          fat_g: { type: "integer" },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["name", "quantity"],
              properties: { name: { type: "string" }, quantity: { type: "string" } },
            },
          },
        },
      },
    },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day_of_week", "label", "blocks"],
        properties: {
          day_of_week: { type: "integer" },
          label: { type: "string" },
          blocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["time", "category", "title", "subtitle", "ref"],
              properties: {
                time: { type: "string" },
                category: { type: "string", enum: ["meal", "train", "rest"] },
                title: { type: "string" },
                subtitle: { type: "string" },
                ref: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const Plan = z.object({
  summary: z.string(),
  workouts: z.array(z.object({
    key: z.string().min(1),
    title: z.string(),
    subtitle: z.string(),
    exercises: z.array(z.object({
      name: z.string().min(1),
      target_display: z.string().min(1),
      sets_count: z.number().int().min(0).max(10),
      note: z.string(),
    })).min(1),
  })),
  meals: z.array(z.object({
    key: z.string().min(1),
    title: z.string(),
    subtitle: z.string(),
    calories: z.number().int(),
    protein_g: z.number().int(),
    carbs_g: z.number().int(),
    fat_g: z.number().int(),
    items: z.array(z.object({ name: z.string().min(1), quantity: z.string().min(1) })).min(1),
  })).min(1),
  days: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    label: z.string().min(1),
    blocks: z.array(z.object({
      time: z.string().regex(HHMM),
      category: z.enum(["meal", "train", "rest"]),
      title: z.string().min(1),
      subtitle: z.string(),
      ref: z.string(),
    })).min(1),
  })).length(7),
});
type Plan = z.infer<typeof Plan>;

// ── Macros por fórmula, no por IA ──
// Gasto: Mifflin-St Jeor × factor de actividad. Reparto según objetivo, siguiendo las posturas de la
// ISSN (proteína 1,6-2,2 g/kg en superávit, 2,3-3,1 g/kg de masa magra en déficit) y del ACSM
// (grasa 20-35 % de las calorías, carbohidrato como combustible del rendimiento).
const GOALS = {
  muscle: {
    energy: 1.1,
    protein_g_per_kg: 2.0,
    fat_pct: 0.25,
    why: [
      "Superávit moderado (+10 %): suficiente para construir músculo sin acumular grasa de más.",
      "Proteína a 2,0 g/kg, en la parte alta del rango para ganar masa muscular.",
      "El resto de calorías va a carbohidrato, el combustible de los entrenos duros.",
    ],
  },
  fat_loss: {
    energy: 0.8,
    protein_g_per_kg: 2.3,
    fat_pct: 0.25,
    why: [
      "Déficit del 20 %: pérdida de grasa sostenible sin hundir el rendimiento.",
      "Proteína alta, 2,3 g/kg: en déficit protege el músculo y quita hambre.",
      "Grasa en torno al 25 % para no comprometer las hormonas; el carbohidrato baja para cuadrar el déficit.",
    ],
  },
  performance: {
    energy: 1.05,
    protein_g_per_kg: 1.8,
    fat_pct: 0.22,
    why: [
      "Ligero superávit (+5 %) para rendir y recuperar entre sesiones.",
      "Proteína a 1,8 g/kg, suficiente para recuperar y adaptarte al entreno.",
      "Grasa algo más baja (22 %) para priorizar el carbohidrato, que es lo que más rendimiento da.",
    ],
  },
  maintain: {
    energy: 1.0,
    protein_g_per_kg: 1.8,
    fat_pct: 0.28,
    why: [
      "Calorías de mantenimiento: mismo peso, mejor composición con el entreno.",
      "Proteína a 1,8 g/kg para mantener y recuperar el músculo.",
      "Reparto equilibrado de grasa y carbohidrato.",
    ],
  },
} as const;

function computeMacros(a: Answers) {
  const g = GOALS[a.goal];
  const bmr = 10 * a.weight_kg + 6.25 * a.height_cm - 5 * a.age + (a.sex === "male" ? 5 : -161);
  const sessions = a.gym_days + (a.sport?.days.length ?? 0);
  const activity = sessions <= 1 ? 1.2 : sessions <= 3 ? 1.375 : sessions <= 5 ? 1.55 : sessions <= 7 ? 1.725 : 1.9;
  const maintenance = Math.round(bmr * activity);
  const calories = Math.round((maintenance * g.energy) / 10) * 10;
  const protein_g = Math.round(a.weight_kg * g.protein_g_per_kg);
  // Mínimo de 0,7 g/kg de grasa aunque el porcentaje salga más bajo.
  const fat_g = Math.max(Math.round((calories * g.fat_pct) / 9), Math.round(a.weight_kg * 0.7));
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));
  const targets = {
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g: Math.round((calories / 1000) * 14),
    sodium_mg: a.sport ? 3000 : 2300,
    potassium_mg: a.sex === "male" ? 3400 : 2600,
    calcium_mg: a.age < 19 ? 1300 : 1000,
    iron_mg: a.sex === "male" ? 8 : 18,
    vitamin_d_mcg: 15,
  };
  const reference = {
    ...targets,
    maintenance_calories: maintenance,
    why: [`Tu gasto estimado es de unas ${maintenance} kcal al día.`, ...g.why],
  };
  return { targets, reference };
}
type Macros = ReturnType<typeof computeMacros>["targets"];

const SYSTEM_PROMPT = `Eres un preparador físico y nutricionista deportivo. Diseñas la semana completa de una persona a partir de su cuestionario: horario hora a hora, sesiones de gimnasio y comidas. La app mostrará tu plan tal cual, así que debe ser realista, concreto y estar en español.

Formato de respuesta (JSON según el esquema):
- "workouts": plantillas de sesiones de gimnasio, cada una con una "key" única (p. ej. "pierna", "torso"). 4-7 ejercicios por sesión, adecuados al objetivo, nivel y material. "target_display" como "4×8-10", "3×12/lado" o "3×30 s". "sets_count" = número de series si el ejercicio lleva peso o se cuenta por series; 0 si es por tiempo continuo (p. ej. "10 min"). "note": un consejo breve en el primer ejercicio, vacío en el resto.
- "meals": plantillas de comidas con "key" única, alimentos con cantidades en crudo ("150 g", "2 unidades"), y sus calorías y macros aproximados.
- "days": exactamente 7 días, day_of_week 0=domingo … 6=sábado, cada uno una vez. "label" corto que resume el día (p. ej. "Pierna · Gym", "Boxeo", "Descanso"). "blocks" ordenados por hora ("HH:MM", 24 h).
- Bloques: category "rest" para despertar, dormir, clases/trabajo, tiempo libre y desconexión (ref vacío). category "meal" con ref = key de una comida. category "train" con ref = key de un workout para sesiones de gimnasio; para el otro deporte usa category "train", ref vacío, title = nombre del deporte.
- "summary": 2-3 frases explicando la lógica del plan a la persona, en segunda persona.

Reglas del horario:
1. El primer bloque de cada día es "Despertar" a la hora de levantarse y el último es "Dormir" a la hora de acostarse.
2. Incluye cada clase/trabajo como bloque "rest" con su hora de inicio y en subtitle el rango ("09:00–14:00").
3. Incluye cada sesión del otro deporte en sus días y hora exactos.
4. Exactamente el número de sesiones de gimnasio pedido, de la duración indicada. Ninguna puede solaparse con clases/trabajo ni con el otro deporte. Prioriza la franja preferida; si no cabe, el hueco libre más cercano.
5. Reparte gimnasio y deporte para dejar descanso: evita días dobles si hay días libres; si hay que doblar, gimnasio y deporte separados al menos 3 h. Si la carga total lo permite, deja al menos un día de descanso completo.
6. Organiza el gimnasio según el deporte y el objetivo (p. ej. para boxeo, potencia de cadera, rotación de core y trabajo unilateral; evita pierna pesada el día antes del deporte).

Reglas de nutrición:
7. 4-6 comidas al día. Una comida pre-entreno 60-120 min antes de cada sesión y una post-entreno en las 2 h siguientes.
8. La suma diaria de las comidas debe acercarse (±10 %) a los objetivos de calorías y macros que te dan; no los recalcules.
9. Comida de verdad, variada, fácil de preparar para un estudiante.`;

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function findProblems(plan: Plan, a: Answers): string[] {
  const problems: string[] = [];
  const days = new Set(plan.days.map((d) => d.day_of_week));
  if (days.size !== 7) problems.push("Debe haber exactamente un bloque de días para cada day_of_week de 0 a 6.");

  const workoutKeys = new Set(plan.workouts.map((w) => w.key));
  const mealKeys = new Set(plan.meals.map((m) => m.key));
  let gymSessions = 0;

  for (const day of plan.days) {
    const name = DAY_NAMES[day.day_of_week];
    const busy: { start: number; end: number; what: string }[] = [];
    for (const c of a.commitments.filter((c) => c.day === day.day_of_week)) {
      busy.push({ start: toMin(c.start), end: toMin(c.end), what: a.commitment_label });
    }
    if (a.sport?.days.includes(day.day_of_week)) {
      const s = toMin(a.sport.start);
      busy.push({ start: s, end: s + a.sport.minutes, what: a.sport.name });
    }

    for (const b of day.blocks) {
      if (b.category === "meal" && !mealKeys.has(b.ref)) {
        problems.push(`El ${name} a las ${b.time} hay una comida con ref "${b.ref}" que no existe en meals.`);
      }
      if (b.category === "train" && b.ref !== "") {
        if (!workoutKeys.has(b.ref)) {
          problems.push(`El ${name} a las ${b.time} hay un entreno con ref "${b.ref}" que no existe en workouts.`);
          continue;
        }
        gymSessions++;
        const start = toMin(b.time);
        const end = start + a.session_minutes;
        for (const x of busy) {
          if (overlaps(start, end, x.start, x.end)) {
            problems.push(`El ${name} la sesión de gimnasio de las ${b.time} se solapa con ${x.what}.`);
          }
        }
      }
    }
  }

  if (gymSessions !== a.gym_days) {
    problems.push(`Hay ${gymSessions} sesiones de gimnasio y se pidieron exactamente ${a.gym_days}.`);
  }
  return problems;
}

function expandPlan(plan: Plan) {
  const workouts = new Map(plan.workouts.map((w) => [w.key, w]));
  const meals = new Map(plan.meals.map((m) => [m.key, m]));
  return {
    days: plan.days.map((d) => ({
      day_of_week: d.day_of_week,
      label: d.label,
      accent_color: DAY_ACCENTS[d.day_of_week],
      blocks: [...d.blocks]
        .sort((x, y) => toMin(x.time) - toMin(y.time))
        .map((b, i) => {
          const w = b.category === "train" ? workouts.get(b.ref) : undefined;
          const m = b.category === "meal" ? meals.get(b.ref) : undefined;
          return {
            time: b.time,
            category: b.category,
            title: b.title,
            subtitle: b.subtitle || w?.subtitle || m?.subtitle || "",
            sort_order: i + 1,
            exercises: (w?.exercises ?? []).map((e, j) => ({ ...e, sort_order: j + 1 })),
            meal_items: (m?.items ?? []).map((it, j) => ({ ...it, sort_order: j + 1 })),
          };
        }),
    })),
  };
}

function userPrompt(a: Answers, macros: Macros) {
  return `Cuestionario de la persona (JSON):
${JSON.stringify(a, null, 2)}

Notas para interpretarlo:
- goal: muscle=ganar músculo, fat_loss=perder grasa, performance=rendimiento en su deporte, maintain=mantenerse.
- commitments: sus ${a.commitment_label.toLowerCase()}s; "day" usa 0=domingo … 6=sábado.
- sport.days usa la misma numeración.

Objetivos diarios ya calculados (no los cambies, reparte las comidas para cuadrar con ellos):
${JSON.stringify(macros)}

Diseña la semana.`;
}

async function askClaude(client: Anthropic, messages: Anthropic.Beta.BetaMessageParam[]) {
  // deno-lint-ignore no-explicit-any
  const params: any = {
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "medium", format: { type: "json_schema", schema: PLAN_JSON_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages,
  };
  const response = await client.beta.messages.stream(params).finalMessage();

  if (response.stop_reason === "refusal") throw new Error("El modelo rechazó generar el plan.");
  if (response.stop_reason === "max_tokens") throw new Error("La respuesta del modelo se cortó antes de terminar.");

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("El modelo no devolvió ningún plan.");
  return { response, plan: Plan.parse(JSON.parse(text.text)) };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const startedAt = Date.now();
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Falta el secreto ANTHROPIC_API_KEY en Supabase." }, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY") ?? req.headers.get("apikey") ?? "",
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return json({ error: "No autenticado" }, 401);

  let answers: Answers;
  try {
    answers = Answers.parse((await req.json()).answers);
  } catch (e) {
    return json({ error: "Respuestas del cuestionario no válidas", detail: String(e) }, 400);
  }

  const { targets: macros, reference: macroReference } = computeMacros(answers);
  const client = new Anthropic({ apiKey, timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0 });
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userPrompt(answers, macros) }];

  let plan: Plan;
  try {
    let result = await askClaude(client, messages);
    let problems = findProblems(result.plan, answers);

    if (problems.length > 0 && Date.now() - startedAt < RETRY_IF_ELAPSED_UNDER_MS) {
      messages.push({ role: "assistant", content: result.response.content });
      messages.push({
        role: "user",
        content: `El plan tiene estos problemas, corrígelos y devuelve el plan completo:\n- ${problems.join("\n- ")}`,
      });
      result = await askClaude(client, messages);
      problems = findProblems(result.plan, answers);
    }

    if (problems.length > 0) {
      return json({ error: "No se pudo generar un plan que encaje con tu horario. Prueba a quitar algún día de gimnasio o a ampliar la franja horaria.", problems }, 422);
    }
    plan = result.plan;
  } catch (e) {
    console.error(e);
    return json({ error: "Error generando el plan con IA", detail: String(e) }, 502);
  }

  const { error: saveError } = await supabase.rpc("apply_generated_plan", {
    plan: { ...expandPlan(plan), macros, macro_reference: macroReference },
    answers,
  });
  if (saveError) return json({ error: "Error guardando el plan", detail: saveError.message }, 500);

  return json({ ok: true, summary: plan.summary, macros: macroReference, seconds: Math.round((Date.now() - startedAt) / 1000) });
});
