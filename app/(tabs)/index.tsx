import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { useIsWide } from '../../lib/layout';
import { onDataChanged } from '../../lib/events';
import { colors, fonts, dayAccents, dayLabels, glow, neon } from '../../lib/theme';
import type { RoutineDay } from '../../lib/types';
import ExerciseSheet from '../../components/ExerciseSheet';
import BlockEditor, { type BlockWithItems } from '../../components/BlockEditor';
import PressableScale from '../../components/PressableScale';

type DayWithBlocks = RoutineDay & { routine_blocks: BlockWithItems[] };

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Orden del día por hora, tomando como inicio el primer bloque del plan (despertar): lo que cae antes
// de esa hora va después de medianoche. sort_order solo desempata.
function sortBlocks(blocks: BlockWithItems[]) {
  if (!blocks.length) return blocks;
  const anchor = toMin(blocks.reduce((a, b) => (b.sort_order < a.sort_order ? b : a)).time);
  const key = (b: BlockWithItems) => { const m = toMin(b.time); return m < anchor ? m + 1440 : m; };
  return blocks.slice().sort((a, b) => key(a) - key(b) || a.sort_order - b.sort_order);
}

// Bloque en curso: el último que ya ha empezado hoy.
function currentBlockId(blocks: BlockWithItems[], now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  let current: string | null = null;
  for (const b of blocks) if (toMin(b.time) <= minutes) current = b.id;
  return current;
}

export default function RutinaScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const wide = useIsWide();
  const [days, setDays] = useState<DayWithBlocks[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDow, setSelectedDow] = useState(new Date().getDay());
  const [editing, setEditing] = useState(false);
  const [openBlock, setOpenBlock] = useState<BlockWithItems | null>(null);
  const [editor, setEditor] = useState<{ day: DayWithBlocks; block: BlockWithItems | null } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [boardWidth, setBoardWidth] = useState(0);

  const load = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('routine_days')
      .select('*, routine_blocks(*, exercises(*), meal_items(*))')
      .eq('user_id', session.user.id);
    if (!error && data) setDays(data as unknown as DayWithBlocks[]);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => onDataChanged(load), [load]);
  // El marcador de "ahora" avanza solo; con un minuto de resolución basta.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  function pressBlock(day: DayWithBlocks, block: BlockWithItems) {
    if (editing) setEditor({ day, block });
    else if (block.category !== 'rest') setOpenBlock(block);
  }

  function addBlock(day: DayWithBlocks) {
    setEditor({ day, block: null });
  }

  const today = now.getDay();
  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>Tu semana</Text>
        {wide ? <Text style={styles.headline}>Rutina</Text> : null}
      </View>
      {days.length ? (
        <PressableScale style={[styles.editButton, editing && styles.editButtonActive]} onPress={() => setEditing((e) => !e)}>
          <Text style={[styles.editText, editing && styles.editTextActive]}>{editing ? 'Listo' : 'Editar'}</Text>
        </PressableScale>
      ) : null}
    </View>
  );

  let content: React.ReactNode;
  if (loading) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (!days.length) {
    content = (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Aún no tienes plan</Text>
        <Text style={styles.emptyText}>Responde el cuestionario y te montamos la semana con tus entrenos y comidas.</Text>
        <PressableScale style={styles.emptyButton} onPress={() => router.push('/onboarding')}>
          <Text style={styles.emptyButtonText}>Crear mi plan</Text>
        </PressableScale>
      </View>
    );
  } else if (wide) {
    content = (
      <ScrollView contentContainerStyle={styles.boardScroll} onLayout={(e) => setBoardWidth(e.nativeEvent.layout.width)}>
        {editing ? <Text style={styles.editHint}>Modo edición: pulsa un bloque para cambiarlo o añade uno nuevo al final de cada día.</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
          {WEEK_ORDER.map((dow) => {
            const day = days.find((d) => d.day_of_week === dow);
            const blocks = sortBlocks(day?.routine_blocks ?? []);
            const isToday = dow === today;
            // Las 7 columnas se reparten el ancho; por debajo de 128 px cada una, la semana se desplaza en horizontal.
            const columnWidth = Math.max(128, Math.floor((boardWidth - 36 - 12 * 6) / 7));
            const current = isToday ? currentBlockId(blocks, now) : null;
            return (
              <View key={dow} style={[styles.column, { width: columnWidth }, isToday && styles.columnToday]}>
                <View style={[styles.columnHeader, { borderBottomColor: dayAccents[dow] }]}>
                  <Text style={[styles.columnDay, { color: dayAccents[dow] }]}>{DAY_NAMES[dow]}</Text>
                  {isToday ? <Text style={styles.todayTag}>Hoy</Text> : null}
                </View>
                <Text style={styles.columnLabel} numberOfLines={2}>{day?.label ?? 'Sin plan'}</Text>
                {day
                  ? blocks.map((b) => (
                      <Pressable
                        key={b.id}
                        onPress={() => pressBlock(day, b)}
                        disabled={!editing && b.category === 'rest'}
                        style={(s) => [
                          styles.card,
                          CARD_ACCENT[b.category],
                          b.id === current && styles.cardNow,
                          (s as { hovered?: boolean }).hovered && (editing || b.category !== 'rest') && styles.cardHover,
                          editing && styles.cardEditing,
                        ]}
                      >
                        <Text style={styles.cardTime}>{b.time}</Text>
                        <Text style={[styles.cardTitle, b.category === 'train' && { color: colors.bloodBright }]} numberOfLines={2}>{b.title}</Text>
                        {b.subtitle ? <Text style={styles.cardSub} numberOfLines={1}>{b.subtitle}</Text> : null}
                      </Pressable>
                    ))
                  : null}
                {editing && day ? (
                  <Pressable onPress={() => addBlock(day)} style={styles.addCard}>
                    <Text style={styles.addCardText}>+ Añadir</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </ScrollView>
    );
  } else {
    const selectedDay = days.find((d) => d.day_of_week === selectedDow);
    const blocks = sortBlocks(selectedDay?.routine_blocks ?? []);
    const current = selectedDow === today ? currentBlockId(blocks, now) : null;
    content = (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip} contentContainerStyle={styles.dayStripContent}>
          {WEEK_ORDER.map((dow) => {
            const active = dow === selectedDow;
            return (
              <Pressable key={dow} onPress={() => setSelectedDow(dow)} style={[styles.dayPill, active && styles.dayPillActive]} hitSlop={4}>
                <Text style={[styles.dayPillText, active && { color: dayAccents[dow] }]}>{dayLabels[dow]}</Text>
                <View style={[styles.todayDot, dow === today && { backgroundColor: neon.line }]} />
              </Pressable>
            );
          })}
        </ScrollView>

        {!selectedDay ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No hay rutina para este día.</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={{ padding: 18, paddingBottom: 130 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
          >
            <View style={[styles.dayHeader, { borderColor: dayAccents[selectedDow] }]}>
              <Text style={[styles.dayName, { color: dayAccents[selectedDow] }]}>{DAY_NAMES[selectedDow]}</Text>
              <Text style={styles.dayType}>{selectedDay.label}</Text>
            </View>
            {editing ? <Text style={styles.editHint}>Pulsa un bloque para cambiarlo.</Text> : null}

            {blocks.map((block, i) => {
              const tappable = editing || block.category !== 'rest';
              const isNow = block.id === current;
              return (
                <Pressable
                  key={block.id}
                  disabled={!tappable}
                  onPress={() => pressBlock(selectedDay, block)}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed, isNow && styles.itemNow]}
                >
                  <Text style={[styles.itemTime, isNow && { color: neon.bright }]}>{block.time}</Text>
                  <View style={styles.rail}>
                    <View style={[styles.railLine, i === 0 && styles.railLineFirst, i === blocks.length - 1 && styles.railLineLast]} />
                    <View style={[styles.dot, DOTS[block.category], isNow && styles.dotNow]} />
                  </View>
                  <View style={styles.itemBody}>
                    {isNow ? <Text style={styles.nowTag}>Ahora</Text> : null}
                    <Text style={[styles.itemTitle, block.category === 'train' && { color: colors.bloodBright }]}>{block.title}</Text>
                    {block.subtitle ? <Text style={styles.itemSubtitle}>{block.subtitle}</Text> : null}
                  </View>
                  {editing ? <Text style={styles.editGlyph}>✎</Text> : tappable ? <Text style={styles.chevron}>›</Text> : null}
                </Pressable>
              );
            })}

            {editing ? (
              <PressableScale style={styles.addRow} onPress={() => addBlock(selectedDay)}>
                <Text style={styles.addCardText}>+ Añadir bloque</Text>
              </PressableScale>
            ) : null}
          </ScrollView>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={[styles.flex, wide && styles.wideFrame]}>
        {header}
        {content}
      </View>

      <ExerciseSheet visible={!!openBlock} onClose={() => setOpenBlock(null)} block={openBlock} userId={session?.user.id ?? ''} />
      <BlockEditor
        visible={!!editor}
        onClose={() => setEditor(null)}
        onSaved={load}
        block={editor?.block ?? null}
        dayId={editor?.day.id ?? ''}
        dayName={editor ? DAY_NAMES[editor.day.day_of_week] : ''}
        nextSortOrder={Math.max(0, ...(editor?.day.routine_blocks ?? []).map((b) => b.sort_order)) + 1}
        defaultTime="12:00"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  wideFrame: { paddingHorizontal: 28, paddingTop: 18 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 8 },
  eyebrow: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent },
  headline: { fontFamily: fonts.display, fontSize: 40, color: colors.text, textTransform: 'uppercase', marginTop: 2 },
  editButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong },
  editButtonActive: { borderColor: neon.line, backgroundColor: colors.surface2, ...glow(10, 0.5) },
  editText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDim },
  editTextActive: { color: neon.bright },
  editHint: { fontFamily: fonts.body, fontSize: 12.5, color: neon.bright, marginBottom: 8, paddingHorizontal: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.text, textTransform: 'uppercase' },
  emptyText: { color: colors.textDim, fontFamily: fonts.body, textAlign: 'center', lineHeight: 20, maxWidth: 340 },
  emptyButton: { marginTop: 8, backgroundColor: neon.line, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 26, ...glow(16, 0.7) },
  emptyButtonText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },

  // Móvil
  dayStrip: { marginTop: 12, flexGrow: 0 },
  dayStripContent: { paddingHorizontal: 18, gap: 8 },
  dayPill: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  dayPillActive: { backgroundColor: colors.surface2, borderColor: neon.line, ...glow(10, 0.55) },
  dayPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textDim },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },
  dayHeader: { borderBottomWidth: 2, paddingBottom: 10, marginBottom: 6 },
  dayName: { fontFamily: fonts.display, fontSize: 28, textTransform: 'uppercase' },
  dayType: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textFaint, marginTop: 3 },
  // Sin padding vertical en la fila: así la línea de cada fila empalma con la siguiente sin cortes.
  item: { flexDirection: 'row', gap: 10, borderRadius: 10 },
  itemPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  itemNow: { backgroundColor: 'rgba(47,168,255,0.07)' },
  itemTime: { fontFamily: fonts.label, fontSize: 12, color: colors.textFaint, width: 42, paddingVertical: 12, paddingLeft: 2 },
  rail: { width: 12, alignItems: 'center' },
  railLine: { position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 1, backgroundColor: neon.soft, ...glow(6, 0.6) },
  railLineFirst: { top: 18 },
  railLineLast: { bottom: undefined, height: 18 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 14, borderWidth: 2, borderColor: colors.bg },
  dotNow: { width: 14, height: 14, borderRadius: 7, marginTop: 12, backgroundColor: neon.bright, ...glow(12, 1) },
  itemBody: { flex: 1, paddingVertical: 10 },
  nowTag: { fontFamily: fonts.label, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: neon.bright, marginBottom: 2 },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  itemSubtitle: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textDim, marginTop: 1 },
  chevron: { color: colors.textFaint, fontSize: 18, paddingVertical: 10, paddingRight: 6 },
  editGlyph: { color: neon.bright, fontSize: 15, paddingVertical: 12, paddingRight: 8 },
  addRow: { marginTop: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: neon.soft, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },

  // Ordenador: la semana entera en columnas
  boardScroll: { paddingTop: 16, paddingBottom: 40, paddingHorizontal: 18 },
  board: { gap: 12 },
  column: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    gap: 6,
  },
  columnToday: { borderColor: neon.line, ...glow(16, 0.35) },
  columnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 2, paddingBottom: 6, paddingHorizontal: 4 },
  columnDay: { fontFamily: fonts.display, fontSize: 18, textTransform: 'uppercase' },
  todayTag: { fontFamily: fonts.label, fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: neon.bright },
  columnLabel: { fontFamily: fonts.label, fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', paddingHorizontal: 4, marginBottom: 4, minHeight: 26 },
  card: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 9,
    backgroundColor: colors.surface2,
    borderLeftWidth: 3,
  },
  cardHover: { backgroundColor: '#1C2129' },
  cardEditing: { borderStyle: 'dashed', borderWidth: 1, borderLeftWidth: 3, borderColor: neon.soft },
  cardNow: { backgroundColor: 'rgba(47,168,255,0.13)', ...glow(10, 0.4) },
  cardTime: { fontFamily: fonts.label, fontSize: 10.5, color: colors.textFaint },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginTop: 1 },
  cardSub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.textDim, marginTop: 1 },
  addCard: { borderWidth: 1, borderStyle: 'dashed', borderColor: neon.soft, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  addCardText: { fontFamily: fonts.bodyBold, fontSize: 13, color: neon.bright },
});

const DOTS = {
  meal: { backgroundColor: colors.accent, ...glow(8, 0.7, '61,139,255') },
  train: { backgroundColor: colors.blood, ...glow(8, 0.8, '218,64,48') },
  rest: { backgroundColor: colors.textFaint },
};

const CARD_ACCENT = {
  meal: { borderLeftColor: colors.accent },
  train: { borderLeftColor: colors.blood },
  rest: { borderLeftColor: colors.textFaint, backgroundColor: 'transparent' },
};
