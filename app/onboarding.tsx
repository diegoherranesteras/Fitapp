import { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { colors, fonts, glow, neon, dayLabels, dayAccents } from '../lib/theme';
import { computeMacros, goalHasRate, rateFeedback, recommendedRate, type RateLevel } from '../lib/nutrition';
import { buildDefaultPlan, fromMin, personDay, weekSchedule } from '../lib/default-plan';
import type { DailyActivity, Goal, Level, OnboardingAnswers, Sex } from '../lib/types';
import Chip from '../components/onboarding/Chip';
import TimeStepper from '../components/onboarding/TimeStepper';
import PressableScale from '../components/PressableScale';

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
const SPORTS = ['Boxeo', 'Fútbol', 'Pádel', 'Running', 'Baloncesto', 'Natación', 'Artes marciales', 'Ciclismo'];
const RATE_COLORS: Record<RateLevel, string> = {
  slow: colors.boneDim,
  ideal: colors.good,
  fast: colors.brassBright,
  too_fast: colors.bloodBright,
};
const STEPS = ['Tú', 'Objetivo', 'Horario', 'Deporte', 'Gimnasio', 'Resumen'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

type CommitmentKind = 'none' | 'Clase' | 'Trabajo';
type Hours = { start: string; end: string };

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
  commitmentKind: CommitmentKind;
  commitments: Record<number, Hours>;
  sameHours: boolean;
  hasSport: boolean;
  sport_name: string;
  sport_days: number[];
  sport_start: string;
  sport_minutes: number;
}

const num = (s: string) => Number(s.replace(',', '.'));
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function draftFrom(a: OnboardingAnswers | null): Draft {
  // Las respuestas guardadas antes de añadir horario y deporte no traen esos campos.
  const commitments = a?.commitments ?? [];
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
    commitmentKind: commitments.length ? (a?.commitment_label === 'Trabajo' ? 'Trabajo' : 'Clase') : 'none',
    commitments: Object.fromEntries(commitments.map((c) => [c.day, { start: c.start, end: c.end }])),
    sameHours: new Set(commitments.map((c) => `${c.start}-${c.end}`)).size <= 1,
    hasSport: !!a?.sport,
    sport_name: a?.sport?.name ?? '',
    sport_days: a?.sport?.days ?? [],
    sport_start: a?.sport?.start ?? '20:00',
    sport_minutes: a?.sport?.minutes ?? 90,
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
    sport: d.hasSport
      ? { name: d.sport_name.trim(), days: [...d.sport_days].sort(), start: d.sport_start, minutes: d.sport_minutes }
      : null,
    commitment_label: d.commitmentKind === 'none' ? '' : d.commitmentKind,
    commitments:
      d.commitmentKind === 'none'
        ? []
        : Object.entries(d.commitments).map(([day, c]) => ({ day: Number(day), start: c.start, end: c.end })),
  };
}

function stepError(step: number, d: Draft): string | null {
  const wake = toMin(d.wake_time);
  const dayMin = personDay(d.wake_time);
  const sleep = dayMin(d.sleep_time);
  const label = d.commitmentKind === 'Trabajo' ? 'el trabajo' : 'la clase';

  if (step === 0) {
    if (!(num(d.age) >= 14 && num(d.age) <= 90)) return 'Pon una edad entre 14 y 90.';
    if (!(num(d.height_cm) >= 120 && num(d.height_cm) <= 230)) return 'Pon tu altura en centímetros (120-230).';
    if (!(num(d.weight_kg) >= 35 && num(d.weight_kg) <= 250)) return 'Pon tu peso en kilos (35-250).';
    if (d.knowsBodyFat && !(num(d.body_fat_pct) >= 3 && num(d.body_fat_pct) <= 60)) {
      return 'El % de grasa debe estar entre 3 y 60. Si no lo sabes, marca "No lo sé".';
    }
  }
  if (step === 1 && goalHasRate(d.goal) && d.weekly_rate_kg <= 0) return 'Elige cuánto quieres cambiar por semana.';
  if (step === 2) {
    if (wake < toMin('05:00') || wake > toMin('11:00')) return 'La hora de levantarte debe estar entre las 05:00 y las 11:00.';
    if (sleep - wake < 12 * 60) return 'Entre levantarte y acostarte debería haber al menos 12 horas.';
    if (d.commitmentKind !== 'none') {
      const days = Object.keys(d.commitments).map(Number);
      if (!days.length) return `Marca qué días tienes ${d.commitmentKind.toLowerCase()}.`;
      for (const day of days) {
        const c = d.commitments[day];
        const [s, e] = [dayMin(c.start), dayMin(c.end)];
        if (e - s < 30 || s < wake || e > sleep) {
          return `El ${DAY_NAMES[day]}, ${label} tiene que empezar después de levantarte y acabar antes de acostarte.`;
        }
      }
    }
  }
  if (step === 3 && d.hasSport) {
    const name = d.sport_name.trim();
    if (!name) return '¿Qué deporte haces? Elige uno o escríbelo.';
    if (!d.sport_days.length) return `Marca qué días entrenas ${name.toLowerCase()}.`;
    const s = dayMin(d.sport_start);
    const e = s + d.sport_minutes;
    if (s < wake + 15 || e > sleep - 30) return `Tu sesión de ${name.toLowerCase()} no cabe entre que te levantas y te acuestas.`;
    if (d.commitmentKind !== 'none') {
      for (const day of d.sport_days) {
        const c = d.commitments[day];
        if (c && s < dayMin(c.end) && dayMin(c.start) < e) return `El ${DAY_NAMES[day]}, ${name.toLowerCase()} coincide con ${label}.`;
      }
    }
  }
  if (step === 4) {
    const { gymDaysMissing } = weekSchedule(toAnswers(d));
    if (gymDaysMissing > 0) {
      const fit = d.gym_days - gymDaysMissing;
      return `Con tu horario solo caben ${fit} ${fit === 1 ? 'día' : 'días'} de gimnasio de ${d.session_minutes} min. Baja los días, acorta la sesión o revisa tu horario.`;
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

  function toggleCommitmentDay(dow: number) {
    setDraft((d) => {
      const next = { ...d.commitments };
      if (next[dow]) delete next[dow];
      else next[dow] = { ...(Object.values(d.commitments)[0] ?? { start: '09:00', end: '14:00' }) };
      return { ...d, commitments: next };
    });
  }

  function setCommitmentHours(dow: number | 'all', hours: Hours) {
    setDraft((d) => {
      const days = dow === 'all' ? Object.keys(d.commitments).map(Number) : [dow];
      const next = { ...d.commitments };
      for (const day of days) next[day] = { ...hours };
      return { ...d, commitments: next };
    });
  }

  function setSameHours(same: boolean) {
    setDraft((d) => {
      const first = Object.values(d.commitments)[0];
      const commitments = same && first ? Object.fromEntries(Object.keys(d.commitments).map((k) => [k, { ...first }])) : d.commitments;
      return { ...d, sameHours: same, commitments };
    });
  }

  function toggleSportDay(dow: number) {
    setDraft((d) => ({ ...d, sport_days: d.sport_days.includes(dow) ? d.sport_days.filter((x) => x !== dow) : [...d.sport_days, dow] }));
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

  const last = STEPS.length - 1;
  const macros = useMemo(() => (step === last ? computeMacros(toAnswers(draft)) : null), [step, draft, last]);
  const schedule = useMemo(() => (step >= 4 ? weekSchedule(toAnswers(draft)) : null), [step, draft]);

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
  const commitmentDays = WEEK.filter((dow) => draft.commitments[dow]);
  const firstCommitment = commitmentDays.length ? draft.commitments[commitmentDays[0]] : null;
  const sportName = draft.sport_name.trim();

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.column}>
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
                <View style={styles.card}>
                  <Text style={styles.label}>¿Cuánto quieres {draft.goal === 'muscle' ? 'ganar' : 'perder'} por semana?</Text>
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
              <Text style={styles.title}>Tu horario</Text>
              <View style={styles.inputsRow}>
                <View style={{ flex: 1 }}>
                  <Label>Te levantas</Label>
                  <TimeStepper value={draft.wake_time} onChange={(v) => set('wake_time', v)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label>Te acuestas</Label>
                  <TimeStepper value={draft.sleep_time} onChange={(v) => set('sleep_time', v)} />
                </View>
              </View>

              <Label>¿Tienes clase o trabajo?</Label>
              <Row>
                {(['none', 'Clase', 'Trabajo'] as const).map((k) => (
                  <Chip key={k} label={k === 'none' ? 'No' : k} selected={draft.commitmentKind === k} onPress={() => set('commitmentKind', k)} />
                ))}
              </Row>

              {draft.commitmentKind !== 'none' ? (
                <View style={styles.card}>
                  <Text style={[styles.label, { marginTop: 0 }]}>¿Qué días?</Text>
                  <Row>
                    {WEEK.map((dow) => (
                      <Chip key={dow} label={dayLabels[dow]} selected={!!draft.commitments[dow]} onPress={() => toggleCommitmentDay(dow)} />
                    ))}
                  </Row>
                  {commitmentDays.length > 1 ? (
                    <>
                      <Label>¿Mismo horario todos los días?</Label>
                      <Row>
                        <Chip label="Sí" selected={draft.sameHours} onPress={() => setSameHours(true)} />
                        <Chip label="No, cambia" selected={!draft.sameHours} onPress={() => setSameHours(false)} />
                      </Row>
                    </>
                  ) : null}
                  {firstCommitment && (draft.sameHours || commitmentDays.length === 1) ? (
                    <HoursRow hours={firstCommitment} onChange={(h) => setCommitmentHours('all', h)} />
                  ) : (
                    commitmentDays.map((dow) => (
                      <View key={dow} style={styles.dayHours}>
                        <Text style={[styles.dayHoursName, { color: dayAccents[dow] }]}>{dayLabels[dow]}</Text>
                        <HoursRow hours={draft.commitments[dow]} onChange={(h) => setCommitmentHours(dow, h)} />
                      </View>
                    ))
                  )}
                </View>
              ) : null}
              <Text style={styles.hint}>
                Con esto colocamos el gimnasio y las comidas en tus huecos libres. Si una comida cae en {draft.commitmentKind === 'Trabajo' ? 'el trabajo' : 'clase'}, te la marcamos para llevar.
              </Text>
            </>
          )}

          {step === 3 && (
            <>
              <Text style={styles.title}>Otro deporte</Text>
              <Label>¿Entrenas algún deporte aparte del gimnasio?</Label>
              <Row>
                <Chip label="Sí" selected={draft.hasSport} onPress={() => set('hasSport', true)} />
                <Chip label="No" selected={!draft.hasSport} onPress={() => set('hasSport', false)} />
              </Row>
              {draft.hasSport ? (
                <View style={styles.card}>
                  <Text style={[styles.label, { marginTop: 0 }]}>¿Cuál?</Text>
                  <Row>{SPORTS.map((s) => <Chip key={s} label={s} selected={sportName === s} onPress={() => set('sport_name', s)} />)}</Row>
                  <TextInput
                    style={styles.textInput}
                    value={SPORTS.includes(sportName) ? '' : draft.sport_name}
                    onChangeText={(v) => set('sport_name', v)}
                    placeholder="¿Otro? Escríbelo aquí"
                    placeholderTextColor={colors.boneFaint}
                    maxLength={40}
                  />
                  <Label>¿Qué días?</Label>
                  <Row>{WEEK.map((dow) => <Chip key={dow} label={dayLabels[dow]} selected={draft.sport_days.includes(dow)} onPress={() => toggleSportDay(dow)} />)}</Row>
                  <View style={styles.inputsRow}>
                    <View style={{ flex: 1 }}>
                      <Label>Empiezas</Label>
                      <TimeStepper value={draft.sport_start} onChange={(v) => set('sport_start', v)} />
                    </View>
                  </View>
                  <Label>¿Cuánto dura?</Label>
                  <Row>{[45, 60, 90, 120].map((n) => <Chip key={n} label={n < 120 ? `${n} min` : '2 h'} selected={draft.sport_minutes === n} onPress={() => set('sport_minutes', n)} />)}</Row>
                </View>
              ) : null}
              <Text style={styles.hint}>
                Lo metemos en tu calendario, no te ponemos el gimnasio encima y sumamos el gasto a tus calorías.
              </Text>
            </>
          )}

          {step === 4 && (
            <>
              <Text style={styles.title}>Gimnasio</Text>
              <Label>¿Cuántos días a la semana?</Label>
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

              {schedule ? (
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>Así quedaría</Text>
                  <View style={styles.previewRow}>
                    {schedule.days.filter((d) => d.gym).map((d) => (
                      <View key={d.dow} style={styles.previewPill}>
                        <Text style={[styles.previewDay, { color: dayAccents[d.dow] }]}>{dayLabels[d.dow]}</Text>
                        <Text style={styles.previewTime}>{fromMin(d.gym![0])}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.hint}>
                    La hora es tu preferencia: si un día choca con {draft.commitmentKind === 'none' ? 'algo' : draft.commitmentKind === 'Trabajo' ? 'el trabajo' : 'clase'}
                    {draft.hasSport && sportName ? ` o con ${sportName.toLowerCase()}` : ''}, la movemos lo justo.
                  </Text>
                </View>
              ) : null}

              <Label>Tu nivel</Label>
              <Row>{LEVELS.map((l) => <Chip key={l.value} label={l.label} selected={draft.level === l.value} onPress={() => set('level', l.value)} />)}</Row>
              <Label>Fuera del deporte, ¿cómo de activo eres?</Label>
              {ACTIVITY.map((a) => (
                <PressableScale key={a.value} onPress={() => set('daily_activity', a.value)} style={[styles.option, draft.daily_activity === a.value && styles.optionSelected]}>
                  <Text style={[styles.optionTitle, draft.daily_activity === a.value && styles.optionTitleSelected]}>{a.label}</Text>
                  <Text style={styles.optionHint}>{a.hint}</Text>
                </PressableScale>
              ))}
            </>
          )}

          {step === last && macros && schedule && (
            <>
              <Text style={styles.title}>Tu semana</Text>
              <View style={styles.card}>
                {schedule.days.map((d) => {
                  const parts = [
                    d.commitment ? `${draft.commitmentKind} ${fromMin(d.commitment[0])}–${fromMin(d.commitment[1])}` : null,
                    d.gym ? `Gym ${fromMin(d.gym[0])}` : null,
                    d.sport ? `${sportName} ${fromMin(d.sport[0])}` : null,
                  ].filter(Boolean);
                  return (
                    <View key={d.dow} style={styles.weekRow}>
                      <Text style={[styles.weekDay, { color: dayAccents[d.dow] }]}>{dayLabels[d.dow]}</Text>
                      <Text style={[styles.weekText, !d.gym && !d.sport && styles.weekRest]}>
                        {d.gym || d.sport ? parts.join('  ·  ') : `Descanso${d.commitment ? `  ·  ${parts[0]}` : ''}`}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.title, { fontSize: 24, marginTop: 22 }]}>Tus números</Text>
              <View style={styles.card}>
                <View style={styles.macroRow}>
                  <Macro label="Calorías" value={`${macros.calories}`} />
                  <Macro label="Proteína" value={`${macros.protein_g} g`} />
                  <Macro label="Carbos" value={`${macros.carbs_g} g`} />
                  <Macro label="Grasas" value={`${macros.fat_g} g`} />
                </View>
                {macros.why.map((line) => <Text key={line} style={styles.whyLine}>· {line}</Text>)}
              </View>
              <Text style={styles.hint}>
                Las comidas se cuadran con estos números y se colocan alrededor de tus entrenos. Todo se puede cambiar después:
                la rutina desde Rutina → Editar y los macros desde Macros.
                {onboarded ? ' Tu plan actual se sustituirá; el historial de pesos que hayas apuntado se mantiene.' : ''}
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <PressableScale wrapperStyle={{ flex: 1 }} style={styles.secondary} onPress={() => { setError(null); setStep((s) => s - 1); }} disabled={saving}>
              <Text style={styles.secondaryText}>Atrás</Text>
            </PressableScale>
          ) : onboarded ? (
            <PressableScale wrapperStyle={{ flex: 1 }} style={styles.secondary} onPress={() => router.back()}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </PressableScale>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <PressableScale wrapperStyle={{ flex: 2 }} style={styles.primary} onPress={step === last ? create : next} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.primaryText}>{step === last ? 'Crear mi plan' : 'Siguiente'}</Text>
            )}
          </PressableScale>
        </View>
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

function HoursRow({ hours, onChange }: { hours: Hours; onChange: (h: Hours) => void }) {
  return (
    <View style={styles.hoursRow}>
      <View>
        <Text style={styles.hoursLabel}>Entras</Text>
        <TimeStepper value={hours.start} onChange={(start) => onChange({ ...hours, start })} />
      </View>
      <View>
        <Text style={styles.hoursLabel}>Sales</Text>
        <TimeStepper value={hours.end} onChange={(end) => onChange({ ...hours, end })} />
      </View>
    </View>
  );
}

function RoundButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.roundButton} onPress={onPress}>
      <Text style={styles.roundButtonText}>{label}</Text>
    </PressableScale>
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
  // En ordenador el cuestionario no se estira a todo el ancho: columna centrada y legible.
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { padding: 22, paddingBottom: 40 },
  progressWrap: { flexDirection: 'row', gap: 6, paddingHorizontal: 22, paddingTop: 10 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surface2 },
  progressBarActive: { backgroundColor: neon.line, ...glow(8, 0.7) },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.brass, marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.bone, textTransform: 'uppercase', marginTop: 6, marginBottom: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.bone, marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.boneFaint, marginTop: 10, lineHeight: 18 },
  inputsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  numberWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  numberInput: {
    flex: 1,
    minWidth: 0,
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
  textInput: {
    marginTop: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.bone,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  unit: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneFaint },
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 16 },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14 },
  hoursLabel: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.boneFaint, marginBottom: 6 },
  dayHours: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  dayHoursName: { fontFamily: fonts.bodyBold, fontSize: 13 },
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
  previewCard: {
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neon.soft,
    backgroundColor: colors.surface,
    padding: 14,
    ...glow(14, 0.3),
  },
  previewTitle: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1.5, textTransform: 'uppercase', color: neon.bright, marginBottom: 10 },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewPill: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface2, minWidth: 58 },
  previewDay: { fontFamily: fonts.bodyBold, fontSize: 12.5 },
  previewTime: { fontFamily: fonts.mono, fontSize: 12, color: colors.bone, marginTop: 2 },
  option: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, marginBottom: 8 },
  optionSelected: { borderColor: colors.brass },
  optionTitle: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.boneDim },
  optionTitleSelected: { color: colors.brassBright },
  optionHint: { fontFamily: fonts.body, fontSize: 12, color: colors.boneFaint, marginTop: 2 },
  weekRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  weekDay: { fontFamily: fonts.bodyBold, fontSize: 13.5, width: 38 },
  weekText: { flex: 1, fontFamily: fonts.mono, fontSize: 12.5, color: colors.bone, lineHeight: 18 },
  weekRest: { color: colors.boneFaint },
  macroRow: { flexDirection: 'row', marginBottom: 10 },
  macroValue: { fontFamily: fonts.display, fontSize: 22, color: colors.brassBright },
  macroLabel: { fontFamily: fonts.body, fontSize: 11.5, color: colors.boneDim },
  whyLine: { fontFamily: fonts.body, fontSize: 13, color: colors.boneDim, lineHeight: 19 },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.bloodBright, marginTop: 16, lineHeight: 19 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.line },
  primary: { backgroundColor: colors.brass, borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.bg },
  secondary: { borderRadius: 10, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: colors.lineStrong },
  secondaryText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.boneDim },
});
