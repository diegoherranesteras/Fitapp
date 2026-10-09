import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { onDataChanged } from '../../lib/events';
import { colors, fonts, glow, neon } from '../../lib/theme';
import type { FoodLog, MacroReference, MacroTargets } from '../../lib/types';
import RingProgress from '../../components/RingProgress';
import EditMacrosModal from '../../components/EditMacrosModal';
import Screen from '../../components/Screen';
import { useI18n, type StringKey } from '../../lib/i18n';

function last7Dates() {
  const out: { iso: string; label: string; dow: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ iso, label: String(d.getDate()), dow: d.getDay() });
  }
  return out;
}

const MICROS: { key: keyof MacroTargets; label: StringKey; unit: string }[] = [
  { key: 'fiber_g', label: 'macros.fiber', unit: 'g' },
  { key: 'sodium_mg', label: 'macros.sodium', unit: 'mg' },
  { key: 'potassium_mg', label: 'macros.potassium', unit: 'mg' },
  { key: 'calcium_mg', label: 'macros.calcium', unit: 'mg' },
  { key: 'iron_mg', label: 'macros.iron', unit: 'mg' },
  { key: 'vitamin_d_mcg', label: 'macros.vitaminD', unit: 'mcg' },
];

export default function MacrosScreen() {
  const { session } = useAuth();
  const { t } = useI18n();
  const dates = last7Dates();
  const [selectedDate, setSelectedDate] = useState(dates[dates.length - 1].iso);
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [reference, setReference] = useState<MacroReference | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const [{ data: t }, { data: l }, { data: p }] = await Promise.all([
      supabase.from('macro_targets').select('*').eq('user_id', session.user.id).maybeSingle(),
      supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', selectedDate)
        .order('logged_at', { ascending: false }),
      supabase.from('profiles').select('macro_reference').eq('user_id', session.user.id).maybeSingle(),
    ]);
    setTargets(t as MacroTargets | null);
    setLogs((l as FoodLog[]) ?? []);
    setReference((p?.macro_reference as MacroReference | null) ?? null);
    setLoading(false);
  }, [session, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  useEffect(() => onDataChanged(load), [load]);

  // Borrar pide dos pulsaciones: la primera arma el botón, la segunda borra. Sin diálogos que bloqueen.
  async function deleteLog(id: string) {
    if (confirmId !== id) return setConfirmId(id);
    setConfirmId(null);
    setLogs((list) => list.filter((l) => l.id !== id));
    await supabase.from('food_logs').delete().eq('id', id);
  }

  const consumed = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + Number(l.protein_g),
      carbs: acc.carbs + Number(l.carbs_g),
      fat: acc.fat + Number(l.fat_g),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calLeft = (targets?.calories ?? 0) - consumed.calories;
  const proteinLeft = (targets?.protein_g ?? 0) - consumed.protein;
  const carbsLeft = (targets?.carbs_g ?? 0) - consumed.carbs;
  const fatLeft = (targets?.fat_g ?? 0) - consumed.fat;

  if (loading && !targets) {
    return (
      <Screen>
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.dateStrip}>
          {dates.map((d) => {
            const active = d.iso === selectedDate;
            return (
              <Pressable key={d.iso} onPress={() => setSelectedDate(d.iso)} style={styles.dateItem}>
                <Text style={styles.dateDow}>{t(`day.letter.${d.dow}` as StringKey)}</Text>
                <View style={[styles.dateCircle, active && styles.dateCircleActive]}>
                  <Text style={[styles.dateNum, active && styles.dateNumActive]}>{d.label}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.ringSection}>
          <RingProgress size={190} strokeWidth={14} progress={targets ? consumed.calories / targets.calories : 0} color={neon.line}>
            <Text style={styles.fire}>🔥</Text>
            <Text style={styles.ringNumber}>{Math.max(0, Math.round(calLeft))}</Text>
            <Text style={styles.ringLabel}>{t('macros.remaining')}</Text>
          </RingProgress>
          <Pressable style={styles.editButton} onPress={() => setEditOpen(true)}>
            <Text style={styles.editIcon}>✎</Text>
          </Pressable>
        </View>

        <View style={styles.smallRings}>
          <View style={styles.smallRingItem}>
            <RingProgress size={78} strokeWidth={7} progress={targets ? consumed.protein / targets.protein_g : 0} color={colors.protein}>
              <Text style={styles.smallRingNum}>{Math.max(0, Math.round(proteinLeft))}g</Text>
            </RingProgress>
            <Text style={styles.smallRingLabel}>{t('macros.protein')}</Text>
          </View>
          <View style={styles.smallRingItem}>
            <RingProgress size={78} strokeWidth={7} progress={targets ? consumed.carbs / targets.carbs_g : 0} color={colors.carbs}>
              <Text style={styles.smallRingNum}>{Math.max(0, Math.round(carbsLeft))}g</Text>
            </RingProgress>
            <Text style={styles.smallRingLabel}>{t('macros.carbs')}</Text>
          </View>
          <View style={styles.smallRingItem}>
            <RingProgress size={78} strokeWidth={7} progress={targets ? consumed.fat / targets.fat_g : 0} color={colors.fat}>
              <Text style={styles.smallRingNum}>{Math.max(0, Math.round(fatLeft))}g</Text>
            </RingProgress>
            <Text style={styles.smallRingLabel}>{t('macros.fat')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('macros.micros')}</Text>
          <View style={styles.microGrid}>
            {MICROS.map((m) => (
              <View key={m.key} style={styles.microItem}>
                <Text style={styles.microLabel}>{t(m.label)}</Text>
                <Text style={styles.microValue}>
                  {targets ? targets[m.key] : '-'} {m.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('macros.logged')}</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>{t('macros.empty')}</Text>
          ) : (
            logs.map((l) => (
              <View key={l.id} style={styles.logRow}>
                <Text style={styles.logIcon}>🍽️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logName}>{l.name}</Text>
                  <Text style={styles.logMacros}>
                    🔥 {l.calories} kcal · {l.protein_g}g P · {l.carbs_g}g C · {l.fat_g}g G
                  </Text>
                </View>
                <Pressable onPress={() => deleteLog(l.id)} hitSlop={8} style={[styles.logDelete, confirmId === l.id && styles.logDeleteArmed]} accessibilityLabel={`Borrar ${l.name}`}>
                  <Text style={[styles.logDeleteText, confirmId === l.id && { color: colors.text }]}>{confirmId === l.id ? t('common.delete') : '✕'}</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <EditMacrosModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        userId={session?.user.id ?? ''}
        current={targets}
        reference={reference}
        onSaved={setTargets}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  dateStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
  dateItem: { alignItems: 'center', gap: 6 },
  dateDow: { fontFamily: fonts.label, fontSize: 10, color: colors.textFaint },
  dateCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  dateCircleActive: { backgroundColor: colors.surface2, borderColor: neon.line, ...glow(10, 0.55) },
  dateNum: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDim },
  dateNumActive: { color: neon.bright },
  ringSection: { alignItems: 'center', marginTop: 26, position: 'relative' },
  fire: { fontSize: 22 },
  ringNumber: { fontFamily: fonts.display, fontSize: 34, color: colors.text, marginTop: 2 },
  ringLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim, marginTop: 2 },
  editButton: { position: 'absolute', top: 0, right: 24, padding: 8 },
  editIcon: { color: colors.textDim, fontSize: 16 },
  smallRings: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 26 },
  smallRingItem: { alignItems: 'center', gap: 8 },
  smallRingNum: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  smallRingLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textDim },
  section: { paddingHorizontal: 18, marginTop: 30 },
  sectionTitle: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 12,
  },
  microGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  microItem: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  microLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textDim },
  microValue: { fontFamily: fonts.label, fontSize: 13, color: colors.text, marginTop: 2 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, lineHeight: 19 },
  logRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  logIcon: { fontSize: 20 },
  logDelete: { minWidth: 34, height: 34, paddingHorizontal: 10, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  logDeleteArmed: { backgroundColor: colors.blood },
  logDeleteText: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.textFaint },
  logName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  logMacros: { fontFamily: fonts.label, fontSize: 11, color: colors.textFaint, marginTop: 3 },
});
