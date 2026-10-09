import { Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';
import PressableScale from '../PressableScale';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function Chip({ label, selected, onPress }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    // surface2 y no surface: los chips suelen ir dentro de tarjetas surface y ahí desaparecían.
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textDim },
  textSelected: { color: colors.bg },
});
