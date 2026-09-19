import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts } from '../../lib/theme';
import type { WeightLog } from '../../lib/types';
import WeightChart from '../../components/WeightChart';
import YearHeatmap from '../../components/YearHeatmap';

export default function ProgresoScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [trainedDates, setTrainedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const [{ data: w }, { data: t }] = await Promise.all([
      supabase.from('weight_logs').select('*').eq('user_id', session.user.id).order('date', { ascending: true }),
      supabase.from('training_log').select('date').eq('user_id', session.user.id).eq('trained', true),
    ]);
    setWeightLogs((w as WeightLog[]) ?? []);
    setTrainedDates(new Set(((t as { date: string }[]) ?? []).map((r) => r.date)));
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg;
  const chartWidth = width - 36 - 24;

  if (loading && weightLogs.length === 0) {
    return (
      <SafeAreaView style={[styles.flex, styles.center]}>
        <ActivityIndicator color={colors.brass} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }}>
        <Text style={styles.eyebrow}>Progreso</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Peso</Text>
          <View style={styles.weightRow}>
            <Text style={styles.weightNumber}>{currentWeight != null ? currentWeight.toFixed(1) : '–'}</Text>
            <Text style={styles.weightUnit}>kg</Text>
          </View>
          <Text style={styles.hint}>Usa el botón + para registrar un nuevo peso</Text>
          <View style={{ marginTop: 14 }}>
            <WeightChart logs={weightLogs} width={chartWidth} height={140} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Calendario anual</Text>
          <YearHeatmap trainedDates={trainedDates} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.brass,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.brass,
    marginBottom: 10,
  },
  weightRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  weightNumber: { fontFamily: fonts.display, fontSize: 40, color: colors.bone },
  weightUnit: { fontFamily: fonts.body, fontSize: 16, color: colors.boneDim },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.boneFaint, marginTop: 2 },
});
