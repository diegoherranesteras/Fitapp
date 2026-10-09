import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { MacroReference, MacroTargets } from '../lib/types';
import Sheet, { sheetText } from './Sheet';
import PressableScale from './PressableScale';
import { useI18n, type StringKey } from '../lib/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  current: MacroTargets | null;
  reference: MacroReference | null;
  onSaved: (t: MacroTargets) => void;
}

type FieldKey = Exclude<keyof MacroTargets, 'user_id'>;

const FIELDS: { key: FieldKey; label: StringKey; unit: string }[] = [
  { key: 'calories', label: 'macros.calories', unit: 'kcal' },
  { key: 'protein_g', label: 'macros.protein', unit: 'g' },
  { key: 'carbs_g', label: 'macros.carbsLong', unit: 'g' },
  { key: 'fat_g', label: 'macros.fat', unit: 'g' },
  { key: 'fiber_g', label: 'macros.fiber', unit: 'g' },
  { key: 'sodium_mg', label: 'macros.sodium', unit: 'mg' },
  { key: 'potassium_mg', label: 'macros.potassium', unit: 'mg' },
  { key: 'calcium_mg', label: 'macros.calcium', unit: 'mg' },
  { key: 'iron_mg', label: 'macros.iron', unit: 'mg' },
  { key: 'vitamin_d_mcg', label: 'macros.vitaminD', unit: 'mcg' },
];

function toStrings(source: Record<FieldKey, number>) {
  const v: Record<string, string> = {};
  FIELDS.forEach((f) => (v[f.key] = String(source[f.key] ?? '')));
  return v;
}

export default function EditMacrosModal({ visible, onClose, userId, current, reference, onSaved }: Props) {
  const { t } = useI18n();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) setValues(toStrings(current));
  }, [current, visible]);

  const num = (k: FieldKey) => Number(values[k]) || 0;
  const macroKcal = num('protein_g') * 4 + num('carbs_g') * 4 + num('fat_g') * 9;
  const kcalGap = macroKcal - num('calories');
  const mismatch = num('calories') > 0 && Math.abs(kcalGap) > num('calories') * 0.05;

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
    FIELDS.forEach((f) => (payload[f.key] = num(f.key)));
    const { data, error } = await supabase.from('macro_targets').upsert(payload, { onConflict: 'user_id' }).select().single();
    setSaving(false);
    if (!error && data) {
      onSaved(data as MacroTargets);
      onClose();
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose}>
          <Text style={sheetText.kicker}>{t('macros.editKicker')}</Text>
          <Text style={[sheetText.title, { marginBottom: 14 }]}>{t('macros.editTitle')}</Text>

          <ScrollView style={{ flexShrink: 1 }}>
            {reference ? (
              <View style={styles.whyBox}>
                <Text style={styles.whyTitle}>{t('macros.reference')}</Text>
                {reference.why.map((line) => (
                  <Text key={line} style={styles.whyLine}>· {line}</Text>
                ))}
              </View>
            ) : null}

            {FIELDS.map((f) => (
              <View key={f.key} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{t(f.label)}</Text>
                  {reference ? (
                    <Text style={styles.recommended}>
                      {t('macros.recommended', { value: reference[f.key], unit: f.unit })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={values[f.key] ?? ''}
                    onChangeText={(text) => setValues((prev) => ({ ...prev, [f.key]: text }))}
                  />
                  <Text style={styles.unit}>{f.unit}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {mismatch ? (
            <Text style={styles.warning}>
              {t('macros.mismatch', { kcal: macroKcal, diff: kcalGap > 0 ? t('macros.more', { n: kcalGap }) : t('macros.less', { n: -kcalGap }) })}
            </Text>
          ) : null}

          {reference ? (
            <Pressable style={styles.resetButton} onPress={() => setValues(toStrings(reference))}>
              <Text style={styles.resetText}>{t('macros.reset')}</Text>
            </Pressable>
          ) : null}

          <PressableScale style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>{t('common.save')}</Text>}
          </PressableScale>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  whyBox: {
    backgroundColor: colors.surface2,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  whyTitle: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.accentBright, marginBottom: 2 },
  whyLine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textDim, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  recommended: { fontFamily: fonts.label, fontSize: 10.5, color: colors.textFaint, marginTop: 2 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    width: 70,
    textAlign: 'right',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    color: colors.text,
    fontFamily: fonts.label,
    fontSize: 14,
  },
  unit: { fontFamily: fonts.label, fontSize: 11, color: colors.textFaint, width: 32 },
  warning: { fontFamily: fonts.body, fontSize: 12, color: colors.accentBright, marginTop: 12, lineHeight: 17 },
  resetButton: { alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  resetText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accentBright },
  saveButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
});
