import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useI18n, LANGUAGES } from '../lib/i18n';
import { colors, fonts, glow, neon } from '../lib/theme';
import Sheet, { sheetText } from './Sheet';
import PressableScale from './PressableScale';

function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang, setLang, t } = useI18n();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={sheetText.kicker}>{t('settings.title')}</Text>
      <Text style={[sheetText.title, { marginBottom: 18 }]}>{t('settings.language')}</Text>
      <View style={{ gap: 8 }}>
        {LANGUAGES.map((l) => {
          const selected = l.code === lang;
          return (
            <PressableScale
              key={l.code}
              onPress={() => setLang(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{l.name}</Text>
              <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.hint}>{t('settings.languageHint')}</Text>
    </Sheet>
  );
}

// Botón de engranaje que abre los ajustes; se puede poner en cualquier cabecera.
export function SettingsButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PressableScale style={styles.gear} onPress={() => setOpen(true)} accessibilityLabel={t('settings.open')} hitSlop={10}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10.3 3.6a1.8 1.8 0 0 1 3.4 0l.3.9a1.8 1.8 0 0 0 2.5 1l.8-.4a1.8 1.8 0 0 1 2.4 2.4l-.4.8a1.8 1.8 0 0 0 1 2.5l.9.3a1.8 1.8 0 0 1 0 3.4l-.9.3a1.8 1.8 0 0 0-1 2.5l.4.8a1.8 1.8 0 0 1-2.4 2.4l-.8-.4a1.8 1.8 0 0 0-2.5 1l-.3.9a1.8 1.8 0 0 1-3.4 0l-.3-.9a1.8 1.8 0 0 0-2.5-1l-.8.4a1.8 1.8 0 0 1-2.4-2.4l.4-.8a1.8 1.8 0 0 0-1-2.5l-.9-.3a1.8 1.8 0 0 1 0-3.4l.9-.3a1.8 1.8 0 0 0 1-2.5l-.4-.8a1.8 1.8 0 0 1 2.4-2.4l.8.4a1.8 1.8 0 0 0 2.5-1z"
            stroke={colors.textDim}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Circle cx={12} cy={12} r={3} stroke={colors.textDim} strokeWidth={1.6} />
        </Svg>
      </PressableScale>
      <SettingsSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  optionSelected: { borderColor: neon.line, ...glow(10, 0.35) },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.textDim },
  optionTextSelected: { color: colors.text },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: neon.line },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: neon.line },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textFaint, marginTop: 16, lineHeight: 18 },
});
