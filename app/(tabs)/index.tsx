import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts, dayAccents, dayLabels } from '../../lib/theme';
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
            <Pressable
              key={dow}
              onPress={() => setSelectedDow(dow)}
              style={[styles.dayPill, active && { backgroundColor: dayAccents[dow] }]}
            >
              <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{dayLabels[dow]}</Text>
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
          <Text style={styles.emptyText}>No hay rutina cargada todavía.{'\n'}Ejecuta supabase/seed.sql para importar tu plan.</Text>
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

          {blocks.map((block) => {
            const tappable = block.category !== 'rest';
            const dotColor =
              block.category === 'meal' ? colors.brass : block.category === 'train' ? colors.blood : colors.boneFaint;
            return (
              <Pressable
                key={block.id}
                disabled={!tappable}
                onPress={() => setOpenBlock(block)}
                style={styles.item}
              >
                <Text style={styles.itemTime}>{block.time}</Text>
                <View style={styles.itemLabWrap}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, block.category === 'train' && { color: colors.bloodBright }]}>
                      {block.title}
                    </Text>
                    {block.subtitle ? <Text style={styles.itemSubtitle}>{block.subtitle}</Text> : null}
                  </View>
                  {tappable ? <Text style={styles.chevron}>›</Text> : null}
                </View>
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
  dayPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.boneDim },
  dayPillTextActive: { color: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { color: colors.boneDim, fontFamily: fonts.body, textAlign: 'center', lineHeight: 20 },
  dayHeader: { borderBottomWidth: 2, paddingBottom: 10, marginBottom: 6 },
  dayName: { fontFamily: fonts.display, fontSize: 26, textTransform: 'uppercase' },
  dayType: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.boneFaint, marginTop: 3 },
  item: { paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: 'row', gap: 10 },
  itemTime: { fontFamily: fonts.mono, fontSize: 12, color: colors.boneFaint, width: 42, paddingTop: 2 },
  itemLabWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.bone },
  itemSubtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.boneDim, marginTop: 1 },
  chevron: { color: colors.boneFaint, fontSize: 18, marginTop: 2 },
});
