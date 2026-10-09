import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors, fonts, neon } from '../lib/theme';
import type { WeightLog } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  logs: WeightLog[]; // ordenados por fecha ascendente
  width: number;
  height: number;
  unit?: string; // los pesos ya vienen convertidos a esta unidad
}

export default function WeightChart({ logs, width, height, unit = 'kg' }: Props) {
  const { t } = useI18n();
  if (logs.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>{t('progress.chartEmpty')}</Text>
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
        {/* Dos trazos: uno ancho y tenue que hace de halo, y el fino encima: efecto tubo de neón. */}
        <Polyline points={polylinePoints} fill="none" stroke={neon.line} strokeOpacity={0.25} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />
        <Polyline points={polylinePoints} fill="none" stroke={neon.bright} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={neon.bright} />
        ))}
      </Svg>
      <View style={styles.legendRow}>
        <Text style={styles.legendText}>{min.toFixed(1)} {unit}</Text>
        <Text style={styles.legendText}>{max.toFixed(1)} {unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textFaint, textAlign: 'center', paddingHorizontal: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  legendText: { fontFamily: fonts.label, fontSize: 11, color: colors.textFaint },
});
