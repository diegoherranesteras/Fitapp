import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipSelected: { backgroundColor: colors.brass, borderColor: colors.brass },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.boneDim },
  textSelected: { color: colors.bg },
});
