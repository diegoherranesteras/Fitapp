import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../lib/theme';

interface Props {
  trainedDates: Set<string>; // 'YYYY-MM-DD'
}

const CELL = 11;
const GAP = 3;

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function YearHeatmap({ trainedDates }: Props) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  // Retrocede hasta el domingo para alinear la primera columna
  while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

  const weeks: Date[][] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const total = Array.from(trainedDates).filter((d) => {
    const dt = new Date(d);
    return dt >= start && dt <= today;
  }).length;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {weeks.map((week, wi) => (
            <View key={wi} style={{ gap: GAP }}>
              {week.map((day, di) => {
                const future = day > today;
                const iso = isoOf(day);
                const trained = trainedDates.has(iso);
                return (
                  <View
                    key={di}
                    style={[
                      styles.cell,
                      future
                        ? styles.cellFuture
                        : trained
                        ? styles.cellTrained
                        : styles.cellEmpty,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={styles.caption}>{total} días entrenados en el último año</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  cellEmpty: { backgroundColor: colors.surface2 },
  cellTrained: { backgroundColor: colors.blood },
  cellFuture: { backgroundColor: 'transparent' },
  caption: { fontFamily: fonts.label, fontSize: 11, color: colors.textFaint, marginTop: 10 },
});
