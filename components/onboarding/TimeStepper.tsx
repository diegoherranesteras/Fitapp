import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

interface Props {
  value: string; // "HH:MM"
  onChange: (value: string) => void;
  stepMinutes?: number;
}

function shift(value: string, delta: number) {
  const [h, m] = value.split(':').map(Number);
  const total = (((h * 60 + m + delta) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export default function TimeStepper({ value, onChange, stepMinutes = 15 }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.button} onPress={() => onChange(shift(value, -stepMinutes))} hitSlop={6}>
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable style={styles.button} onPress={() => onChange(shift(value, stepMinutes))} hitSlop={6}>
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.text, fontSize: 18, fontFamily: fonts.bodyBold, marginTop: -2 },
  value: { fontFamily: fonts.label, fontSize: 18, color: colors.text, minWidth: 64, textAlign: 'center' },
});
