import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, neon } from '../lib/theme';
import { MUSCLE_GROUPS, searchExercises, type LibraryExercise, type MuscleGroup } from '../lib/exercise-library';
import type { BlockCategory, Exercise, MealItem, RoutineBlock } from '../lib/types';
import Sheet, { sheetText } from './Sheet';
import PressableScale from './PressableScale';
import Chip from './onboarding/Chip';
import TimeStepper from './onboarding/TimeStepper';

export type BlockWithItems = RoutineBlock & { exercises: Exercise[]; meal_items: MealItem[] };

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  // null = bloque nuevo en ese día
  block: BlockWithItems | null;
  dayId: string;
  dayName: string;
  nextSortOrder: number;
  defaultTime: string;
}

interface DraftExercise { id?: string; name: string; sets: number; reps: string; note: string | null }
interface DraftMeal { id?: string; name: string; quantity: string }
type Picking = { index: number | 'new' } | null;

const CATEGORIES: { value: BlockCategory; label: string }[] = [
  { value: 'train', label: 'Entreno' },
  { value: 'meal', label: 'Comida' },
  { value: 'rest', label: 'Otro' },
];

// "4×6-8" → 4 series de "6-8"
function parseTarget(ex: Exercise): DraftExercise {
  const m = ex.target_display.match(/^\s*(\d+)\s*[×x]\s*(.+)$/);
  return { id: ex.id, name: ex.name, sets: m ? Number(m[1]) : ex.sets_count, reps: m ? m[2] : ex.target_display, note: ex.note };
}

export default function BlockEditor({ visible, onClose, onSaved, block, dayId, dayName, nextSortOrder, defaultTime }: Props) {
  const [time, setTime] = useState(defaultTime);
  const [category, setCategory] = useState<BlockCategory>('train');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [exercises, setExercises] = useState<DraftExercise[]>([]);
  const [meals, setMeals] = useState<DraftMeal[]>([]);
  const [picking, setPicking] = useState<Picking>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTime(block?.time ?? defaultTime);
    setCategory(block?.category ?? 'train');
    setTitle(block?.title ?? '');
    setSubtitle(block?.subtitle ?? '');
    setExercises((block?.exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map(parseTarget));
    setMeals((block?.meal_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order).map((m) => ({ id: m.id, name: m.name, quantity: m.quantity })));
    setPicking(null);
    setConfirmDelete(false);
    setError(null);
  }, [visible, block?.id]);

  const updateExercise = (i: number, patch: Partial<DraftExercise>) =>
    setExercises((list) => list.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const moveExercise = (i: number, dir: -1 | 1) =>
    setExercises((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = list.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function pick(ex: LibraryExercise | { name: string }) {
    if (!picking) return;
    if (picking.index === 'new') {
      const lib = 'sets' in ex ? ex : null;
      setExercises((list) => [...list, { name: ex.name, sets: lib?.sets ?? 3, reps: lib?.reps ?? '10-12', note: null }]);
    } else {
      // Cambiar un ejercicio mantiene las series, repeticiones y nota (descansos) de ese hueco de la rutina.
      updateExercise(picking.index, { name: ex.name });
    }
    setPicking(null);
  }

  async function save() {
    if (!title.trim()) return setError('Ponle un título al bloque.');
    if (category === 'train' && exercises.some((e) => !e.name.trim() || !e.reps.trim())) return setError('Cada ejercicio necesita nombre y repeticiones.');
    if (category === 'meal' && meals.some((m) => !m.name.trim())) return setError('Cada alimento necesita nombre.');
    setBusy(true);
    setError(null);
    try {
      const fields = { time, category, title: title.trim(), subtitle: subtitle.trim() || null };
      let blockId = block?.id;
      if (blockId) {
        const { error: e } = await supabase.from('routine_blocks').update(fields).eq('id', blockId);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase
          .from('routine_blocks')
          .insert({ ...fields, routine_day_id: dayId, sort_order: nextSortOrder })
          .select('id')
          .single();
        if (e) throw e;
        blockId = data.id as string;
      }

      await syncChildren(
        'exercises',
        blockId!,
        category === 'train' ? exercises : [],
        (e, i) => ({ name: e.name.trim(), target_display: `${e.sets}×${e.reps.trim()}`, sets_count: e.sets, sort_order: i + 1, note: e.note }),
      );
      await syncChildren(
        'meal_items',
        blockId!,
        category === 'meal' ? meals : [],
        (m, i) => ({ name: m.name.trim(), quantity: m.quantity.trim(), sort_order: i + 1 }),
      );
      setBusy(false);
      onSaved();
      onClose();
    } catch (e) {
      setBusy(false);
      setError(`No se pudo guardar: ${(e as Error).message}`);
    }
  }

  async function remove() {
    if (!block) return;
    if (!confirmDelete) return setConfirmDelete(true);
    setBusy(true);
    const { error: e } = await supabase.from('routine_blocks').delete().eq('id', block.id);
    setBusy(false);
    if (e) return setError(`No se pudo borrar: ${e.message}`);
    onSaved();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
      {picking ? (
        <ExercisePicker onBack={() => setPicking(null)} onPick={pick} replacing={picking.index !== 'new' ? exercises[picking.index]?.name : null} />
      ) : (
        <>
          <Text style={sheetText.kicker}>{dayName} · {block ? 'Editar bloque' : 'Nuevo bloque'}</Text>
          <Text style={sheetText.title} numberOfLines={1}>{title.trim() || 'Sin título'}</Text>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.label}>Hora</Text>
                <TimeStepper value={time} onChange={setTime} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <Text style={styles.label}>Tipo</Text>
                <View style={styles.chips}>
                  {CATEGORIES.map((c) => <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />)}
                </View>
              </View>
            </View>

            <Text style={styles.label}>Título</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={category === 'meal' ? 'Comida' : category === 'train' ? 'Gym · Pierna' : 'Clase'} placeholderTextColor={colors.textFaint} />
            <Text style={styles.label}>Detalle (opcional)</Text>
            <TextInput style={styles.input} value={subtitle} onChangeText={setSubtitle} placeholder={category === 'meal' ? 'arroz + pollo' : '60 min'} placeholderTextColor={colors.textFaint} />

            {category === 'train' ? (
              <>
                <Text style={styles.section}>Ejercicios</Text>
                {exercises.map((e, i) => (
                  <View key={`${e.id ?? 'new'}-${i}`} style={styles.exCard}>
                    <View style={styles.exTop}>
                      <Text style={styles.exIndex}>{String(i + 1).padStart(2, '0')}</Text>
                      <Pressable style={{ flex: 1 }} onPress={() => setPicking({ index: i })} accessibilityLabel={`Cambiar ${e.name}`}>
                        <Text style={styles.exName}>{e.name}</Text>
                        <Text style={styles.exSwap}>Cambiar ejercicio ›</Text>
                      </Pressable>
                      <IconButton label="↑" onPress={() => moveExercise(i, -1)} disabled={i === 0} />
                      <IconButton label="↓" onPress={() => moveExercise(i, 1)} disabled={i === exercises.length - 1} />
                      <IconButton label="✕" danger onPress={() => setExercises((list) => list.filter((_, j) => j !== i))} />
                    </View>
                    <View style={styles.exControls}>
                      <View style={styles.stepper}>
                        <IconButton label="−" onPress={() => updateExercise(i, { sets: Math.max(1, e.sets - 1) })} />
                        <Text style={styles.stepperValue}>{e.sets}</Text>
                        <IconButton label="+" onPress={() => updateExercise(i, { sets: Math.min(10, e.sets + 1) })} />
                        <Text style={styles.stepperUnit}>series</Text>
                      </View>
                      <View style={styles.repsWrap}>
                        <TextInput style={[styles.input, styles.repsInput]} value={e.reps} onChangeText={(reps) => updateExercise(i, { reps })} placeholder="8-10" placeholderTextColor={colors.textFaint} />
                        <Text style={styles.stepperUnit}>reps</Text>
                      </View>
                    </View>
                  </View>
                ))}
                <PressableScale style={styles.addButton} onPress={() => setPicking({ index: 'new' })}>
                  <Text style={styles.addText}>+ Añadir ejercicio</Text>
                </PressableScale>
              </>
            ) : null}

            {category === 'meal' ? (
              <>
                <Text style={styles.section}>Alimentos</Text>
                {meals.map((m, i) => (
                  <View key={`${m.id ?? 'new'}-${i}`} style={styles.mealRow}>
                    <TextInput style={[styles.input, { flex: 2 }]} value={m.name} onChangeText={(name) => setMeals((list) => list.map((x, j) => (j === i ? { ...x, name } : x)))} placeholder="Alimento" placeholderTextColor={colors.textFaint} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={m.quantity} onChangeText={(quantity) => setMeals((list) => list.map((x, j) => (j === i ? { ...x, quantity } : x)))} placeholder="150 g" placeholderTextColor={colors.textFaint} />
                    <IconButton label="✕" danger onPress={() => setMeals((list) => list.filter((_, j) => j !== i))} />
                  </View>
                ))}
                <PressableScale style={styles.addButton} onPress={() => setMeals((list) => [...list, { name: '', quantity: '' }])}>
                  <Text style={styles.addText}>+ Añadir alimento</Text>
                </PressableScale>
              </>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.footer}>
            {block ? (
              <PressableScale wrapperStyle={{ flex: 1 }} style={[styles.delete, confirmDelete && styles.deleteConfirm]} onPress={remove} disabled={busy}>
                <Text style={[styles.deleteText, confirmDelete && { color: colors.text }]}>{confirmDelete ? '¿Seguro? Pulsa otra vez' : 'Borrar'}</Text>
              </PressableScale>
            ) : null}
            <PressableScale wrapperStyle={{ flex: 2 }} style={styles.save} onPress={save} disabled={busy}>
              {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>Guardar</Text>}
            </PressableScale>
          </View>
        </>
      )}
    </Sheet>
  );
}

// Borra los hijos que ya no están, actualiza los que siguen y crea los nuevos, en el orden de la lista.
async function syncChildren<T extends { id?: string }>(
  table: 'exercises' | 'meal_items',
  blockId: string,
  items: T[],
  toRow: (item: T, index: number) => Record<string, unknown>,
) {
  const keep = items.map((x) => x.id).filter((x): x is string => !!x);
  let del = supabase.from(table).delete().eq('routine_block_id', blockId);
  if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`);
  const { error: delError } = await del;
  if (delError) throw delError;

  const results = await Promise.all(
    items.map((item, i) =>
      item.id
        ? supabase.from(table).update(toRow(item, i)).eq('id', item.id)
        : supabase.from(table).insert({ ...toRow(item, i), routine_block_id: blockId }),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

function ExercisePicker({ onBack, onPick, replacing }: { onBack: () => void; onPick: (e: LibraryExercise | { name: string }) => void; replacing: string | null }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const results = useMemo(() => searchExercises(query, group), [query, group]);
  const custom = query.trim();
  const exact = results.some((r) => r.name.toLowerCase() === custom.toLowerCase());

  return (
    <>
      <Pressable onPress={onBack} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
        <Text style={styles.backLink}>‹ Volver</Text>
      </Pressable>
      <Text style={sheetText.title}>{replacing ? 'Cambiar ejercicio' : 'Añadir ejercicio'}</Text>
      {replacing ? <Text style={sheetText.subtitle}>En lugar de {replacing}</Text> : null}

      <TextInput style={[styles.input, { marginTop: 14 }]} value={query} onChangeText={setQuery} placeholder="Buscar: press, remo, sentadilla…" placeholderTextColor={colors.textFaint} autoFocus />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupStrip} contentContainerStyle={{ gap: 6, paddingRight: 8 }}>
        <Chip label="Todos" selected={!group} onPress={() => setGroup(null)} />
        {MUSCLE_GROUPS.map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />)}
      </ScrollView>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {custom && !exact ? (
          <PressableScale style={styles.resultRow} onPress={() => onPick({ name: custom })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>Usar «{custom}»</Text>
              <Text style={styles.resultMeta}>Ejercicio propio</Text>
            </View>
            <Text style={styles.resultPlus}>+</Text>
          </PressableScale>
        ) : null}
        {results.map((r) => (
          <PressableScale key={r.name} style={styles.resultRow} onPress={() => onPick(r)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{r.name}</Text>
              <Text style={styles.resultMeta}>{r.group} · {r.equipment} · {r.sets}×{r.reps}</Text>
            </View>
            <Text style={styles.resultPlus}>{replacing ? '⇄' : '+'}</Text>
          </PressableScale>
        ))}
        {results.length === 0 && !custom ? <Text style={styles.empty}>No hay ejercicios en este grupo.</Text> : null}
      </ScrollView>
    </>
  );
}

function IconButton({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <PressableScale style={[styles.iconButton, disabled && { opacity: 0.3 }]} onPress={onPress} disabled={disabled} hitSlop={6}>
      <Text style={[styles.iconText, danger && { color: colors.bloodBright }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 10, flexShrink: 1 },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  label: { fontFamily: fonts.label, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.textFaint, marginTop: 14, marginBottom: 8 },
  section: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent, marginTop: 22, marginBottom: 10 },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  exCard: { backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 8, gap: 10 },
  exTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exIndex: { fontFamily: fonts.label, fontSize: 11, color: colors.textFaint, width: 20 },
  exName: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  exSwap: { fontFamily: fonts.body, fontSize: 11.5, color: neon.bright, marginTop: 2 },
  exControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, paddingLeft: 26 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperValue: { fontFamily: fonts.label, fontSize: 16, color: colors.text, minWidth: 22, textAlign: 'center' },
  stepperUnit: { fontFamily: fonts.label, fontSize: 10.5, color: colors.textFaint, marginLeft: 2 },
  repsWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  repsInput: { width: 92, paddingVertical: 8, fontFamily: fonts.label, fontSize: 14, textAlign: 'center', backgroundColor: colors.surface },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  iconText: { color: colors.textDim, fontSize: 15, fontFamily: fonts.bodyBold },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  addButton: { borderWidth: 1, borderStyle: 'dashed', borderColor: neon.soft, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  addText: { fontFamily: fonts.bodyBold, fontSize: 14, color: neon.bright },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.bloodBright, marginTop: 10 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 14 },
  delete: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(240,85,67,0.45)' },
  deleteConfirm: { backgroundColor: colors.blood, borderColor: colors.blood },
  deleteText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bloodBright },
  save: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
  backLink: { fontFamily: fonts.bodyMedium, fontSize: 14, color: neon.bright, marginBottom: 6 },
  groupStrip: { marginTop: 10, flexGrow: 0 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  resultName: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.text },
  resultMeta: { fontFamily: fonts.label, fontSize: 10.5, color: colors.textFaint, marginTop: 2 },
  resultPlus: { fontFamily: fonts.bodyBold, fontSize: 20, color: neon.bright, width: 28, textAlign: 'center' },
  empty: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, paddingVertical: 16 },
});
