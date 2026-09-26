import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fonts, glow, neon } from '../lib/theme';
import { computeMacros, goalHasRate, rateFeedback, recommendedRate, type RateLevel } from '../lib/nutrition';
import { buildDefaultPlan } from '../lib/default-plan';
import type { DailyActivity, Goal, Level, OnboardingAnswers, Sex } from '../lib/types';
import Chip from '../components/onboarding/Chip';
import TimeStepper from '../components/onboarding/TimeStepper';

const GOALS: { value: Goal; label: string }[] = [
  { value: 'muscle', label: 'Ganar músculo' },
  { value: 'fat_loss', label: 'Perder grasa' },
  { value: 'maintain', label: 'Mantenerme' },
  { value: 'performance', label: 'Rendir en mi deporte' },
];
const LEVELS: { value: Level; label: string }[] = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];
const ACTIVITY: { value: DailyActivity; label: string; hint: string }[] = [
  { value: 'sedentary', label: 'Sentado casi todo el día', hint: 'Clase, oficina, estudio' },
  { value: 'light', label: 'Me muevo algo', hint: 'Voy andando a sitios, estoy de pie a ratos' },
  { value: 'active', label: 'Muy activo', hint: 'Trabajo físico o camino mucho' },
];
const RATE_COLORS: Record<RateLevel, string> = {
  slow: colors.boneDim,
  ideal: colors.good,
  fast: colors.brassBright,
  too_fast: colors.bloodBright,
};
const STEPS = ['Tú', 'Objetivo', 'Entreno', 'Descanso', 'Resumen'];

interface Draft {
  sex: Sex;
  age: string;
  height_cm: string;
  weight_kg: string;
  knowsBodyFat: boolean;
  body_fat_pct: string;
  goal: Goal;
  weekly_rate_kg: number;
  daily_activity: DailyActivity;
  gym_days: number;
  training_time: string;
  session_minutes: number;
  level: Level;
  wake_time: string;
  sleep_time: string;
}

const num = (s: string) => Number(s.replace(',', '.'));
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function draftFrom(a: OnboardingAnswers | null): Draft {
  return {
    sex: a?.sex ?? 'male',
    age: a ? String(a.age) : '',
    height_cm: a ? String(a.height_cm) : '',
    weight_kg: a ? String(a.weight_kg) : '',
    knowsBodyFat: a?.body_fat_pct != null,
    body_fat_pct: a?.body_fat_pct != null ? String(a.body_fat_pct) : '',
    goal: a?.goal ?? 'muscle',
    weekly_rate_kg: a?.weekly_rate_kg ?? 0,
    daily_activity: a?.daily_activity ?? 'sedentary',
    gym_days: a?.gym_days ?? 4,
    training_time: a?.training_time ?? '18:00',
    session_minutes: a?.session_minutes ?? 60,
    level: a?.level ?? 'intermediate',
    wake_time: a?.wake_time ?? '07:30',
    sleep_time: a?.sleep_time ?? '23:30',
  };
}

function toAnswers(d: Draft): OnboardingAnswers {
  return {
    sex: d.sex,
    age: num(d.age),
    height_cm: num(d.height_cm),
    weight_kg: num(d.weight_kg),
    body_fat_pct: d.knowsBodyFat ? num(d.body_fat_pct) : null,
    goal: d.goal,
    weekly_rate_kg: goalHasRate(d.goal) ? d.weekly_rate_kg : 0,
    daily_activity: d.daily_activity,
    gym_days: d.gym_days,
    training_time: d.training_time,
    session_minutes: d.session_minutes,
    level: d.level,
    wake_time: d.wake_time,
    sleep_time: d.sleep_time,
  };
}

function stepError(step: number, d: Draft): string | null {
  if (step === 0) {
    if (!(num(d.age) >= 14 && num(d.age) <= 90)) return 'Pon una edad entre 14 y 90.';
    if (!(num(d.height_cm) >= 120 && num(d.height_cm) <= 230)) return 'Pon tu altura en centímetros (120-230).';
    if (!(num(d.weight_kg) >= 35 && num(d.weight_kg) <= 250)) return 'Pon tu peso en kilos (35-250).';
    if (d.knowsBodyFat && !(num(d.body_fat_pct) >= 3 && num(d.body_fat_pct) <= 60)) {
      return 'El % de grasa debe estar entre 3 y 60. Si no lo sabes, marca "No lo sé".';
    }
  }
  if (step === 1 && goalHasRate(d.goal) && d.weekly_rate_kg <= 0) return 'Elige cuánto quieres cambiar por semana.';
  if (step === 3) {
    const wake = toMin(d.wake_time);
    const dayMin = (t: string) => { const x = toMin(t); return x < wake ? x + 1440 : x; };
    if (wake < toMin('05:00') || wake > toMin('11:00')) return 'La hora de levantarte debe estar entre las 05:00 y las 11:00.';
    if (dayMin(d.sleep_time) - wake < 12 * 60) return 'Entre levantarte y acostarte debería haber al menos 12 horas.';
    const start = dayMin(d.training_time);
    if (start < wake + 15 || start + d.session_minutes > dayMin(d.sleep_time) - 30) {
      return `Tu entreno (${d.training_time}, ${d.session_minutes} min) no cabe entre que te levantas y te acuestas. Cambia la hora del entreno o tu horario de sueño.`;
    }
  }
  return null;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { session, onboarded, onboardingAnswers, refreshProfile } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(onboardingAnswers));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const weight = num(draft.weight_kg);

  function chooseGoal(goal: Goal) {
    setDraft((d) => ({
      ...d,
      goal,
      weekly_rate_kg: goalHasRate(goal) && weight > 0 ? recommendedRate(goal, weight) : 0,
    }));
  }

  function next() {
    const err = stepError(step, draft);
    setError(err);
    if (err) return;
    if (step === 0 && goalHasRate(draft.goal) && draft.weekly_rate_kg <= 0) {
      set('weekly_rate_kg', recommendedRate(draft.goal, weight));
    }
    setStep((s) => s + 1);
  }

  const macros = useMemo(() => (step === 4 ? computeMacros(toAnswers(draft)) : null), [step, draft]);

  async function create() {
    if (!session || !macros) return;
    setSaving(true);
    setError(null);
    const answers = toAnswers(draft);
    const plan = { ...buildDefaultPlan(answers, macros), macros, macro_reference: macros };
    const { error: rpcError } = await supabase.rpc('apply_generated_plan', { plan, answers });
    if (rpcError) {
      setSaving(false);
      setError(`No se pudo guardar tu plan: ${rpcError.message}`);
      return;
    }
    await refreshProfile();
    router.replace('/(tabs)');
  }

  const feedback = goalHasRate(draft.goal) && weight > 0 ? rateFeedback(draft.goal, draft.weekly_rate_kg, weight) : null;

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.progressWrap}>
        {STEPS.map((s, i) => <View key={s} style={[styles.progressBar, i <= step && styles.progressBarActive]} />)}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Paso {step + 1} de {STEPS.length} · {STEPS[step]}</Text>

        {step === 0 && (
          <>
            <Text style={styles.title}>Cuéntame de ti</Text>
            <Label>Sexo</Label>
            <Row>
              <Chip label="Hombre" selected={draft.sex === 'male'} onPress={() => set('sex', 'male')} />
              <Chip label="Mujer" selected={draft.sex === 'female'} onPress={() => set('sex', 'female')} />
            </Row>
            <View style={styles.inputsRow}>
              <NumberField label="Edad" unit="años" value={draft.age} onChange={(v) => set('age', v)} />
              <NumberField label="Altura" unit="cm" value={draft.height_cm} onChange={(v) => set('height_cm', v)} />
              <NumberField label="Peso" unit="kg" value={draft.weight_kg} onChange={(v) => set('weight_kg', v)} />
            </View>
            <Label>¿Sabes tu % de grasa corporal?</Label>
            <Row>
              <Chip label="Sí" selected={draft.knowsBodyFat} onPress={() => set('knowsBodyFat', true)} />
              <Chip label="No lo sé" selected={!draft.knowsBodyFat} onPress={() => set('knowsBodyFat', false)} />
            </Row>
            {draft.knowsBodyFat ? (
              <View style={{ width: 140, marginTop: 4 }}>
                <NumberField label="% de grasa" unit="%" value={draft.body_fat_pct} onChange={(v) => set('body_fat_pct', v)} />
              </View>
            ) : null}
            <Text style={styles.hint}>
              Es opcional, pero con él el cálculo es más preciso: la proteína se ajusta a tu masa magra. Lo da una báscula de
              bioimpedancia o un plicómetro.
            </Text>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.title}>Tu objetivo</Text>
            <Row>{GOALS.map((g) => <Chip key={g.value} label={g.label} selected={draft.goal === g.value} onPress={() => chooseGoal(g.value)} />)}</Row>

            {goalHasRate(draft.goal) && feedback ? (
              <View style={styles.rateCard}>
                <Text style={styles.label}>
                  ¿Cuánto quieres {draft.goal === 'muscle' ? 'ganar' : 'perder'} por semana?
                </Text>
                <View style={styles.rateRow}>
                  <RoundButton label="−" onPress={() => set('weekly_rate_kg', Math.max(0.05, +(draft.weekly_rate_kg - 0.05).toFixed(2)))} />
                  <Text style={[styles.rateValue, { color: RATE_COLORS[feedback.level] }]}>
                    {draft.weekly_rate_kg.toLocaleString('es-ES', { minimumFractionDigits: 2 })} kg
                  </Text>
                  <RoundButton label="+" onPress={() => set('weekly_rate_kg', Math.min(2, +(draft.weekly_rate_kg + 0.05).toFixed(2)))} />
                </View>
                <View style={styles.rateBarTrack}>
                  <View
                    style={[
                      styles.rateBarFill,
                      {
                        width: `${Math.min(100, (feedback.pctPerWeek / (draft.goal === 'muscle' ? 1 : 2)) * 100)}%`,
                        backgroundColor: RATE_COLORS[feedback.level],
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.rateMessage, { color: RATE_COLORS[feedback.level] }]}>{feedback.message}</Text>
                <Text style={styles.hint}>
                  {feedback.pctPerWeek.toLocaleString('es-ES', { maximumFractionDigits: 2 })} % de tu peso por semana · unos{' '}
                  {feedback.monthlyKg.toLocaleString('es-ES', { maximumFractionDigits: 1 })} kg al mes. Recomendado:{' '}
                  {draft.goal === 'muscle' ? '0,1-0,5 %' : '0,5-1 %'} semanal.
                </Text>
              </View>
            ) : null}
            {draft.goal === 'maintain' ? <Text style={styles.hint}>Comerás lo que gastas: mismo peso, mejor composición.</Text> : null}
            {draft.goal === 'performance' ? <Text style={styles.hint}>Un ligero superávit para rendir y recuperar mejor.</Text> : null}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>Tu entreno</Text>
            <Label>¿Cuántos días a la semana vas al gimnasio?</Label>
            <Row>{[1, 2, 3, 4, 5, 6].map((n) => <Chip key={n} label={String(n)} selected={draft.gym_days === n} onPress={() => set('gym_days', n)} />)}</Row>
            <Label>¿Cuándo te gustaría entrenar?</Label>
            <Row>
              <Chip label="Por la mañana" selected={toMin(draft.training_time) < toMin('14:00')} onPress={() => set('training_time', '08:30')} />
              <Chip label="Por la tarde" selected={toMin(draft.training_time) >= toMin('14:00')} onPress={() => set('training_time', '18:00')} />
            </Row>
            <Label>¿A qué hora empiezas?</Label>
            <TimeStepper value={draft.training_time} onChange={(v) => set('training_time', v)} />
            <Label>¿Cuánto tiempo quieres entrenar?</Label>
            <Row>{[45, 60, 75, 90, 120].map((n) => <Chip key={n} label={n < 120 ? `${n} min` : '2 h'} selected={draft.session_minutes === n} onPress={() => set('session_minutes', n)} />)}</Row>
            <Label>Tu nivel</Label>
            <Row>{LEVELS.map((l) => <Chip key={l.value} label={l.label} selected={draft.level === l.value} onPress={() => set('level', l.value)} />)}</Row>
            <Label>Fuera del gimnasio, ¿cómo de activo eres?</Label>
            {ACTIVITY.map((a) => (
              <Pressable key={a.value} onPress={() => set('daily_activity', a.value)} style={[styles.option, draft.daily_activity === a.value && styles.optionSelected]}>
                <Text style={[styles.optionTitle, draft.daily_activity === a.value && styles.optionTitleSelected]}>{a.label}</Text>
                <Text style={styles.optionHint}>{a.hint}</Text>
              </Pressable>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>Tu descanso</Text>
            <Label>¿A qué hora te levantas?</Label>
            <TimeStepper value={draft.wake_time} onChange={(v) => set('wake_time', v)} />
            <Label>¿A qué hora te acuestas?</Label>
            <TimeStepper value={draft.sleep_time} onChange={(v) => set('sleep_time', v)} />
            <Text style={styles.hint}>Con esto colocamos tus comidas alrededor del entreno: pre-entreno antes y una comida en las 2 h de después.</Text>
          </>
        )}

        {step === 4 && macros && (
          <>
            <Text style={styles.title}>Tus números</Text>
            <View style={styles.macroCard}>
              <View style={styles.macroRow}>
                <Macro label="Calorías" value={`${macros.calories}`} />
                <Macro label="Proteína" value={`${macros.protein_g} g`} />
                <Macro label="Carbos" value={`${macros.carbs_g} g`} />
                <Macro label="Grasas" value={`${macros.fat_g} g`} />
              </View>
              {macros.why.map((line) => <Text key={line} style={styles.whyLine}>· {line}</Text>)}
            </View>
            <Text style={styles.hint}>
              Te crearemos una semana de {draft.gym_days} {draft.gym_days === 1 ? 'día' : 'días'} de gimnasio a las {draft.training_time}, con
              las comidas cuadradas a estos números. Todo se puede cambiar después: los macros desde Macros, con el lápiz.
              {onboarded ? ' Tu plan actual se sustituirá.' : ''}
            </Text>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <Pressable style={styles.secondary} onPress={() => { setError(null); setStep((s) => s - 1); }} disabled={saving}>
            <Text style={styles.secondaryText}>Atrás</Text>
          </Pressable>
        ) : onboarded ? (
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Cancelar</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable style={styles.primary} onPress={step === STEPS.length - 1 ? create : next} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.primaryText}>{step === STEPS.length - 1 ? 'Crear mi plan' : 'Siguiente'}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function RoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.roundButton} onPress={onPress} hitSlop={6}>
      <Text style={styles.roundButtonText}>{label}</Text>
    </Pressable>
  );
}

function NumberField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.numberWrap}>
        <TextInput style={styles.numberInput} keyboardType="decimal-pad" value={value} onChangeText={onChange} placeholder="–" placeholderTextColor={colors.boneFaint} />
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 22, paddingBottom: 40 },
  progressWrap: { flexDirection: 'row', gap: 6, paddingHorizontal: 22, paddingTop: 10 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface2 },
  progressBarActive: { backgroundColor: neon.line, ...glow(8, 0.7) },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.brass, marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.bone, textTransform: 'uppercase', marginTop: 6, marginBottom: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bone, marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.boneFaint, marginTop: 10, lineHeight: 18 },
  inputsRow: { flexDirection: 'row', gap: 10 },
  numberWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numberInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.bone,
    fontFamily: fonts.mono,
    fontSize: 16,
  },
  unit: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneFaint },
  rateCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 20 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  rateValue: { fontFamily: fonts.display, fontSize: 34, minWidth: 130, textAlign: 'center' },
  rateBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, marginTop: 14, overflow: 'hidden' },
  rateBarFill: { height: 6, borderRadius: 3 },
  rateMessage: { fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 12 },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundButtonText: { color: colors.bone, fontSize: 22, fontFamily: fonts.bodyBold, marginTop: -2 },
  option: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 8 },
  optionSelected: { borderColor: colors.brass },
  optionTitle: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.boneDim },
  optionTitleSelected: { color: colors.brassBright },
  optionHint: { fontFamily: fonts.body, fontSize: 12, color: colors.boneFaint, marginTop: 2 },
  macroCard: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 10, gap: 6 },
  macroRow: { flexDirection: 'row', marginBottom: 10 },
  macroValue: { fontFamily: fonts.display, fontSize: 22, color: colors.brassBright },
  macroLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.boneDim },
  whyLine: { fontFamily: fonts.body, fontSize: 13, color: colors.boneDim, lineHeight: 19 },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.bloodBright, marginTop: 16, lineHeight: 19 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.line },
  primary: { flex: 2, backgroundColor: colors.brass, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.bg },
  secondary: { flex: 1, borderRadius: 10, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: colors.lineStrong },
  secondaryText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.boneDim },
});
