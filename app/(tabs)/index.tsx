import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts, dayAccents, dayLabels, glow, neon } from '../../lib/theme';
import type { Exercise, MealItem, RoutineBlock, RoutineDay } from '../../lib/types';
import ExerciseSheet from '../../components/ExerciseSheet';

type BlockWithItems = RoutineBlock & { exercises: Exercise[]; meal_items: MealItem[] };
type DayWithBlocks = RoutineDay & { routine_blocks: BlockWithItems[] };

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function todayDayOfWeek() {
  return new Date().getDay();
}

export default function RutinaScreen() {
  const { session } = useAuth();
  const [days, setDays] = useState<DayWithBlocks[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDow, setSelectedDow] = useState(todayDayOfWeek());
  const [openBlock, setOpenBlock] = useState<BlockWithItems | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('routine_days')
      .select('*, routine_blocks(*, exercises(*), meal_items(*))')
      .eq('user_id', session.user.id);
    if (!error && data) {
      setDays(data as unknown as DayWithBlocks[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  const selectedDay = days.find((d) => d.day_of_week === selectedDow);
  const blocks = (selectedDay?.routine_blocks ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tu semana</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip} contentContainerStyle={styles.dayStripContent}>
        {WEEK_ORDER.map((dow) => {
          const active = dow === selectedDow;
          return (
            <Pressable key={dow} onPress={() => setSelectedDow(dow)} style={[styles.dayPill, active && styles.dayPillActive]}>
              <Text style={[styles.dayPillText, active && { color: dayAccents[dow] }]}>{dayLabels[dow]}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brass} />
        </View>
      ) : !selectedDay ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay rutina para este día.{'\n'}Puedes crear tu plan desde Perfil → Rehacer mi plan.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brass} />}
        >
          <View style={[styles.dayHeader, { borderColor: dayAccents[selectedDow] }]}>
            <Text style={[styles.dayName, { color: dayAccents[selectedDow] }]}>{dayLabels[selectedDow]}</Text>
            <Text style={styles.dayType}>{selectedDay.label}</Text>
          </View>

          {blocks.map((block, i) => {
            const tappable = block.category !== 'rest';
            return (
              <Pressable
                key={block.id}
                disabled={!tappable}
                onPress={() => setOpenBlock(block)}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <Text style={styles.itemTime}>{block.time}</Text>
                <View style={styles.rail}>
                  <View style={[styles.railLine, i === 0 && styles.railLineFirst, i === blocks.length - 1 && styles.railLineLast]} />
                  <View style={[styles.dot, DOTS[block.category]]} />
                </View>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemTitle, block.category === 'train' && { color: colors.bloodBright }]}>{block.title}</Text>
                  {block.subtitle ? <Text style={styles.itemSubtitle}>{block.subtitle}</Text> : null}
                </View>
                {tappable ? <Text style={styles.chevron}>›</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ExerciseSheet
        visible={!!openBlock}
        onClose={() => setOpenBlock(null)}
        block={openBlock}
        userId={session?.user.id ?? ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 8 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.brass,
  },
  dayStrip: { marginTop: 10, flexGrow: 0 },
  dayStripContent: { paddingHorizontal: 18, gap: 8 },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  dayPillActive: { backgroundColor: colors.surface2, borderColor: neon.line, ...glow(10, 0.55) },
  dayPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.boneDim },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { color: colors.boneDim, fontFamily: fonts.body, textAlign: 'center', lineHeight: 20 },
  dayHeader: { borderBottomWidth: 2, paddingBottom: 10, marginBottom: 6 },
  dayName: { fontFamily: fonts.display, fontSize: 26, textTransform: 'uppercase' },
  dayType: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.boneFaint, marginTop: 3 },
  // Sin padding vertical en la fila: así la línea de cada fila empalma con la siguiente sin cortes.
  item: { flexDirection: 'row', gap: 10, borderRadius: 8 },
  itemPressed: { backgroundColor: 'rgba(242,232,219,0.04)' },
  itemTime: { fontFamily: fonts.mono, fontSize: 12, color: colors.boneFaint, width: 42, paddingVertical: 12 },
  rail: { width: 12, alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: neon.soft, ...glow(6, 0.6) },
  railLineFirst: { top: 18 },
  railLineLast: { bottom: undefined, height: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 14, borderWidth: 2, borderColor: colors.bg },
  itemBody: { flex: 1, paddingVertical: 10 },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.bone },
  itemSubtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.boneDim, marginTop: 1 },
  chevron: { color: colors.boneFaint, fontSize: 18, paddingVertical: 10, paddingRight: 4 },
});

const DOTS = {
  meal: { backgroundColor: colors.brass, ...glow(8, 0.7, '207,166,78') },
  train: { backgroundColor: colors.blood, ...glow(8, 0.8, '218,64,48') },
  rest: { backgroundColor: colors.boneFaint },
};
