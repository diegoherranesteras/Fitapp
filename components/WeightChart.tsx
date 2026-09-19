import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors, fonts } from '../lib/theme';
import type { WeightLog } from '../lib/types';

interface Props {
  logs: WeightLog[]; // ordenados por fecha ascendente
  width: number;
  height: number;
}

export default function WeightChart({ logs, width, height }: Props) {
  if (logs.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Registra tu peso para ver la evolución aquí.</Text>
      </View>
    );
  }

  const padding = 20;
  const weights = logs.map((l) => l.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const points = logs.map((l, i) => {
    const x = logs.length === 1 ? width / 2 : padding + (i / (logs.length - 1)) * (width - padding * 2);
    const y = height - padding - ((l.weight_kg - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={width} height={height}>
        <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={colors.line} strokeWidth={1} />
        <Polyline points={polylinePoints} fill="none" stroke={colors.brassBright} strokeWidth={2.5} />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.brassBright} />
        ))}
      </Svg>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>{min.toFixed(1)} kg</Text>
        <Text style={styles.legendText}>{max.toFixed(1)} kg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.boneFaint, textAlign: 'center', paddingHorizontal: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  legendText: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneFaint },
});
