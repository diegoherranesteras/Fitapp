import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { onDataChanged } from '../../lib/events';
import { useIsWide } from '../../lib/layout';
import { formatWeight, toUnit } from '../../lib/units';
import { colors, fonts } from '../../lib/theme';
import type { WeightLog } from '../../lib/types';
import WeightChart from '../../components/WeightChart';
import YearHeatmap from '../../components/YearHeatmap';
import Screen from '../../components/Screen';

export default function ProgresoScreen() {
  const { session, weightUnit } = useAuth();
  const wide = useIsWide();
  const { width } = useWindowDimensions();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [trainedDates, setTrainedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(Math.min(width, 760) - 68);

  const load = useCallback(async () => {
    if (!session) return;
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('user_id', session.user.id).order('date', { ascending: true }),
      supabase.from('training_log').select('date').eq('user_id', session.user.id).eq('trained', true),
    ]);
    setWeightLogs((w as WeightLog[]) ?? []);
    setTrainedDates(new Set(((t as { date: string }[]) ?? []).map((r) => r.date)));
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => onDataChanged(load), [load]);

  const current = weightLogs[weightLogs.length - 1];
  const first = weightLogs[0];
  const change = current && first && weightLogs.length > 1 ? current.weight_kg - first.weight_kg : null;
  // La gráfica se dibuja en la unidad del perfil.
  const chartLogs = weightLogs.map((l) => ({ ...l, weight_kg: toUnit(Number(l.weight_kg), weightUnit) }));
  const onChartLayout = (e: LayoutChangeEvent) => setChartWidth(Math.max(200, e.nativeEvent.layout.width));

  if (loading && weightLogs.length === 0) {
    return (
      <Screen>
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={colors.brass} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={1100}>
      <ScrollView contentContainerStyle={{ padding: wide ? 28 : 18, paddingBottom: 130 }}>
        <Text style={styles.eyebrow}>Progreso</Text>
        {wide ? <Text style={styles.headline}>Tu evolución</Text> : null}

        <View style={[styles.grid, wide && styles.gridWide]}>
          <View style={[styles.card, wide && { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Peso</Text>
            <View style={styles.weightRow}>
              <Text style={styles.weightNumber}>{current ? formatWeight(Number(current.weight_kg), weightUnit) : '–'}</Text>
              <Text style={styles.weightUnit}>{weightUnit}</Text>
              {change != null ? (
                <Text style={[styles.change, { color: change >= 0 ? colors.carbs : colors.fat }]}>
                  {change >= 0 ? '▲' : '▼'} {formatWeight(Math.abs(change), weightUnit)} {weightUnit} desde el {first.date.split('-').reverse().slice(0, 2).join('/')}
                </Text>
              ) : null}
            </View>
            <Text style={styles.hint}>Registra tu peso con el botón +</Text>
            <View style={{ marginTop: 14 }} onLayout={onChartLayout}>
              <WeightChart logs={chartLogs} width={chartWidth} height={wide ? 200 : 140} unit={weightUnit} />
            </View>
          </View>

          <View style={[styles.card, wide && { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Calendario anual</Text>
            <YearHeatmap trainedDates={trainedDates} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.brass, marginBottom: 14 },
  headline: { fontFamily: fonts.display, fontSize: 40, color: colors.bone, textTransform: 'uppercase', marginTop: -10, marginBottom: 18 },
  grid: { gap: 16 },
  gridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, minWidth: 0 },
  sectionTitle: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.brass, marginBottom: 10 },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 },
  weightNumber: { fontFamily: fonts.display, fontSize: 44, color: colors.bone },
  weightUnit: { fontFamily: fonts.body, fontSize: 16, color: colors.boneDim },
  change: { fontFamily: fonts.mono, fontSize: 11.5, marginLeft: 8 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.boneFaint, marginTop: 2 },
});
