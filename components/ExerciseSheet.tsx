import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { emitDataChanged } from '../lib/events';
import { formatWeight, parseWeight } from '../lib/units';
import { colors, fonts } from '../lib/theme';
import type { Exercise, MealItem, RoutineBlock } from '../lib/types';
import Sheet, { sheetText } from './Sheet';
import PressableScale from './PressableScale';

type BlockWithItems = RoutineBlock & { exercises?: Exercise[]; meal_items?: MealItem[] };

interface Props {
  visible: boolean;
  onClose: () => void;
  block: BlockWithItems | null;
  userId: string;
}

interface SetRow {
  exercise_name: string | null;
  date: string;
  set_index: number;
  weight: number | null;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShort(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export default function ExerciseSheet({ visible, onClose, block, userId }: Props) {
  const { weightUnit } = useAuth();
  const [loading, setLoading] = useState(false);
  // Última sesión anterior a hoy, por nombre de ejercicio: sobrevive a rehacer el plan o cambiar ejercicios.
  const [previous, setPrevious] = useState<Record<string, { date: string; weights: (number | null)[] }>>({});
  const [inputs, setInputs] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exercises = (block?.exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const mealItems = (block?.meal_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const loggable = exercises.filter((e) => e.sets_count > 0);

  useEffect(() => {
    setSaved(false);
    setError(null);
    if (!visible || !block || block.category !== 'train' || loggable.length === 0) {
      setPrevious({});
      setInputs({});
      return;
    }
    setLoading(true);
    const today = todayISO();
    supabase
      .from('exercise_set_logs')
      .select('exercise_name, date, set_index, weight')
      .eq('user_id', userId)
      .in('exercise_name', loggable.map((e) => e.name))
      .order('date', { ascending: false })
      .limit(500)
      .then(({ data }) => {
        const rows = (data ?? []) as SetRow[];
        const prev: typeof previous = {};
        const todays: Record<string, (number | null)[]> = {};
        for (const ex of loggable) {
          const mine = rows.filter((r) => r.exercise_name === ex.name);
          const lastDate = mine.find((r) => r.date < today)?.date;
          if (lastDate) {
            const weights = new Array<number | null>(ex.sets_count).fill(null);
            mine.filter((r) => r.date === lastDate && r.set_index < ex.sets_count).forEach((r) => (weights[r.set_index] = r.weight));
            prev[ex.name] = { date: lastDate, weights };
          }
          todays[ex.id] = new Array<number | null>(ex.sets_count).fill(null);
          mine.filter((r) => r.date === today && r.set_index < ex.sets_count).forEach((r) => (todays[ex.id][r.set_index] = r.weight));
        }
        setPrevious(prev);
        setInputs(
          Object.fromEntries(
            loggable.map((ex) => [ex.id, todays[ex.id].map((w) => (w == null ? '' : formatWeight(w, weightUnit)))]),
          ),
        );
        setLoading(false);
      });
  }, [visible, block?.id]);

  function setInput(exId: string, sets: number, i: number, text: string) {
    setSaved(false);
    setInputs((prev) => {
      const arr = (prev[exId] ?? new Array(sets).fill('')).slice();
      arr[i] = text;
      return { ...prev, [exId]: arr };
    });
  }

  async function saveWeights() {
    if (!block) return;
    setSaving(true);
    setError(null);
    const today = todayISO();
    const rows: object[] = [];
    for (const ex of loggable) {
      (inputs[ex.id] ?? []).forEach((val, setIndex) => {
        const kg = parseWeight(val, weightUnit);
        if (kg == null) return;
        rows.push({ user_id: userId, exercise_id: ex.id, exercise_name: ex.name, date: today, set_index: setIndex, weight: kg });
      });
    }
    if (rows.length > 0) {
      const { error: err } = await supabase.from('exercise_set_logs').upsert(rows, { onConflict: 'user_id,exercise_id,date,set_index' });
      if (err) {
        setSaving(false);
        setError(
          err.message.includes('exercise_name')
            ? 'Falta actualizar la base de datos: ejecuta supabase/migrations/003_set_history.sql en Supabase.'
            : err.message,
        );
        return;
      }
    }
    await markTrainedToday();
  }

  async function markTrainedToday() {
    setSaving(true);
    await supabase.from('training_log').upsert({ user_id: userId, date: todayISO(), trained: true }, { onConflict: 'user_id,date' });
    setSaving(false);
    setSaved(true);
    emitDataChanged();
  }

  if (!block) return null;
  const isTrain = block.category === 'train';

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={sheetText.kicker}>
        {block.time} · {isTrain ? 'Entreno' : block.category === 'meal' ? 'Comida' : 'Bloque'}
      </Text>
      <Text style={sheetText.title}>{block.title}</Text>
      {block.subtitle ? <Text style={sheetText.subtitle}>{block.subtitle}</Text> : null}

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {block.category === 'meal' &&
          mealItems.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowVal}>{item.quantity}</Text>
            </View>
          ))}

        {isTrain && loading ? <ActivityIndicator color={colors.brass} style={{ marginVertical: 20 }} /> : null}

        {isTrain &&
          !loading &&
          exercises.map((ex, idx) => {
            const prev = previous[ex.name];
            return (
              <View key={ex.id} style={styles.exBlock}>
                <View style={styles.exHeader}>
                  <Text style={styles.exIndex}>{String(idx + 1).padStart(2, '0')}</Text>
                  <Text style={styles.rowName}>{ex.name}</Text>
                  <Text style={styles.rowVal}>{ex.target_display}</Text>
                </View>
                {ex.note ? <Text style={styles.note}>{ex.note}</Text> : null}
                {ex.sets_count > 0 ? (
                  <>
                    <View style={styles.weightsRow}>
                      {(inputs[ex.id] ?? new Array(ex.sets_count).fill('')).map((val, i) => {
                        const last = prev?.weights[i];
                        return (
                          <View key={i} style={styles.setCell}>
                            <Text style={styles.setLabel}>S{i + 1}</Text>
                            <TextInput
                              style={[styles.weightInput, val !== '' && styles.weightInputFilled]}
                              keyboardType="decimal-pad"
                              placeholder={last != null ? formatWeight(last, weightUnit) : '–'}
                              placeholderTextColor={colors.boneFaint}
                              value={val}
                              onChangeText={(text) => setInput(ex.id, ex.sets_count, i, text)}
                            />
                          </View>
                        );
                      })}
                    </View>
                    <Text style={styles.refText}>
                      {prev ? `Última vez (${formatShort(prev.date)}) en gris · ${weightUnit}` : `Primera vez: apunta tus pesos en ${weightUnit}`}
                    </Text>
                  </>
                ) : null}
              </View>
            );
          })}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isTrain ? (
        <PressableScale
          style={[styles.saveButton, saved && styles.saveButtonDone]}
          onPress={loggable.length > 0 ? saveWeights : markTrainedToday}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.saveText}>
              {saved ? 'Guardado ✓' : loggable.length > 0 ? 'Guardar pesos de hoy' : 'Marcar entreno de hoy'}
            </Text>
          )}
        </PressableScale>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 12, flexShrink: 1 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bone, paddingRight: 10 },
  rowVal: { fontFamily: fonts.mono, fontSize: 13, color: colors.brass },
  exBlock: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 12, gap: 8 },
  exHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  exIndex: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneFaint },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.boneFaint, lineHeight: 17 },
  weightsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  setCell: { alignItems: 'center', gap: 4 },
  setLabel: { fontFamily: fonts.mono, fontSize: 9.5, color: colors.boneFaint },
  weightInput: {
    width: 58,
    height: 44,
    textAlign: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    color: colors.bone,
    fontFamily: fonts.mono,
    fontSize: 14,
  },
  weightInputFilled: { borderColor: colors.brass },
  refText: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.boneFaint },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.bloodBright, marginTop: 10, lineHeight: 18 },
  saveButton: { backgroundColor: colors.brass, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 14 },
  saveButtonDone: { backgroundColor: colors.good },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
});
