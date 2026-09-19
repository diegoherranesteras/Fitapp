import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { Exercise, MealItem, RoutineBlock } from '../lib/types';

type BlockWithItems = RoutineBlock & { exercises?: Exercise[]; meal_items?: MealItem[] };

interface Props {
  visible: boolean;
  onClose: () => void;
  block: BlockWithItems | null;
  userId: string;
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
  const [loading, setLoading] = useState(false);
  const [refs, setRefs] = useState<Record<string, { date: string; weights: (number | null)[] }>>({});
  const [inputs, setInputs] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const exercises = (block?.exercises ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const mealItems = (block?.meal_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const loggable = exercises.filter((e) => e.sets_count > 0);

  useEffect(() => {
    if (!visible || !block || block.category !== 'train' || loggable.length === 0) {
      setRefs({});
      setInputs({});
      setSaved(false);
      return;
    }
    setSaved(false);
    setLoading(true);
    const ids = loggable.map((e) => e.id);
    supabase
      .from('exercise_set_logs')
      .select('*')
      .eq('user_id', userId)
      .in('exercise_id', ids)
      .order('date', { ascending: false })
      .then(({ data }) => {
        const byExercise: Record<string, { date: string; weights: (number | null)[] }> = {};
        (data ?? []).forEach((row: any) => {
          const ex = loggable.find((e) => e.id === row.exercise_id);
          if (!ex) return;
          if (!byExercise[row.exercise_id]) {
            byExercise[row.exercise_id] = { date: row.date, weights: new Array(ex.sets_count).fill(null) };
          }
          if (byExercise[row.exercise_id].date === row.date) {
            byExercise[row.exercise_id].weights[row.set_index] = row.weight;
          }
        });
        setRefs(byExercise);
        const initialInputs: Record<string, string[]> = {};
        loggable.forEach((ex) => {
          const prev = byExercise[ex.id];
          initialInputs[ex.id] = new Array(ex.sets_count)
            .fill('')
            .map((_, i) => (prev?.weights[i] != null ? String(prev.weights[i]) : ''));
        });
        setInputs(initialInputs);
        setLoading(false);
      });
  }, [visible, block?.id]);

  async function saveWeights() {
    if (!block) return;
    setSaving(true);
    const today = todayISO();
    const rows: any[] = [];
    loggable.forEach((ex) => {
      (inputs[ex.id] ?? []).forEach((val, setIndex) => {
        if (val === '') return;
        rows.push({
          user_id: userId,
          exercise_id: ex.id,
          date: today,
          set_index: setIndex,
          weight: Number(val),
        });
      });
    });
    if (rows.length > 0) {
      await supabase.from('exercise_set_logs').upsert(rows, { onConflict: 'user_id,exercise_id,date,set_index' });
    }
    await supabase.from('training_log').upsert({ user_id: userId, date: today, trained: true }, { onConflict: 'user_id,date' });
    setSaving(false);
    setSaved(true);
  }

  async function markTrained() {
    setSaving(true);
    await supabase
      .from('training_log')
      .upsert({ user_id: userId, date: todayISO(), trained: true }, { onConflict: 'user_id,date' });
    setSaving(false);
    setSaved(true);
  }

  if (!block) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <Pressable style={styles.close} onPress={onClose} hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.kicker}>{block.category === 'train' ? 'Entreno' : 'Comida'}</Text>
          <Text style={styles.title}>{block.title}</Text>
          {block.subtitle ? <Text style={styles.subtitle}>{block.subtitle}</Text> : null}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {block.category === 'meal' &&
              mealItems.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowVal}>{item.quantity}</Text>
                </View>
              ))}

            {block.category === 'train' &&
              exercises.map((ex) => {
                const ref = refs[ex.id];
                const canLog = ex.sets_count > 0;
                return (
                  <View key={ex.id} style={styles.exBlock}>
                    <View style={styles.row}>
                      <Text style={styles.rowName}>{ex.name}</Text>
                      <Text style={styles.rowVal}>{ex.target_display}</Text>
                    </View>
                    {ex.note ? <Text style={styles.note}>{ex.note}</Text> : null}
                    {canLog && ref ? (
                      <Text style={styles.refText}>
                        Referencia ({formatShort(ref.date)}): {ref.weights.map((w) => (w == null ? '-' : w)).join(' · ')} kg
                      </Text>
                    ) : null}
                    {canLog && (
                      <View style={styles.weightsRow}>
                        {(inputs[ex.id] ?? new Array(ex.sets_count).fill('')).map((val, i) => (
                          <TextInput
                            key={i}
                            style={styles.weightInput}
                            keyboardType="numeric"
                            placeholder={`S${i + 1}`}
                            placeholderTextColor={colors.boneFaint}
                            value={val}
                            onChangeText={(text) =>
                              setInputs((prev) => {
                                const next = { ...prev };
                                const arr = (next[ex.id] ?? new Array(ex.sets_count).fill('')).slice();
                                arr[i] = text;
                                next[ex.id] = arr;
                                return next;
                              })
                            }
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
          </ScrollView>

          {block.category === 'train' && loggable.length > 0 && (
            <Pressable style={[styles.saveButton, saved && styles.saveButtonDone]} onPress={saveWeights} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.saveText}>{saved ? 'Guardado ✓' : 'Guardar pesos de hoy'}</Text>
              )}
            </Pressable>
          )}
          {block.category === 'train' && loggable.length === 0 && (
            <Pressable style={[styles.saveButton, saved && styles.saveButtonDone]} onPress={markTrained} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.saveText}>{saved ? 'Guardado ✓' : 'Marcar entreno de hoy'}</Text>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(9,4,4,0.68)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 30,
    maxHeight: '88%',
  },
  close: { position: 'absolute', top: 14, right: 14, padding: 8, zIndex: 1 },
  closeText: { color: colors.boneDim, fontSize: 16 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.brass },
  title: { fontFamily: fonts.display, fontSize: 26, color: colors.bone, textTransform: 'uppercase', marginTop: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.boneDim, marginTop: 4, marginBottom: 4 },
  body: { marginTop: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  rowName: { fontFamily: fonts.body, fontSize: 15, color: colors.bone, flexShrink: 1, paddingRight: 10 },
  rowVal: { fontFamily: fonts.mono, fontSize: 13, color: colors.brass },
  exBlock: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 10, gap: 6 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.boneFaint, lineHeight: 17 },
  refText: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneFaint },
  weightsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  weightInput: {
    width: 52,
    paddingVertical: 8,
    textAlign: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    color: colors.bone,
    fontFamily: fonts.mono,
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: colors.brass,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonDone: { backgroundColor: colors.good },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
});
