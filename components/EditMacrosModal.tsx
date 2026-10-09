import { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { MacroReference, MacroTargets } from '../lib/types';
import Sheet, { sheetText } from './Sheet';
import PressableScale from './PressableScale';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  current: MacroTargets | null;
  reference: MacroReference | null;
  onSaved: (t: MacroTargets) => void;
}

type FieldKey = Exclude<keyof MacroTargets, 'user_id'>;

const FIELDS: { key: FieldKey; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calorías', unit: 'kcal' },
  { key: 'protein_g', label: 'Proteína', unit: 'g' },
  { key: 'carbs_g', label: 'Carbohidratos', unit: 'g' },
  { key: 'fat_g', label: 'Grasas', unit: 'g' },
  { key: 'fiber_g', label: 'Fibra', unit: 'g' },
  { key: 'sodium_mg', label: 'Sodio', unit: 'mg' },
  { key: 'potassium_mg', label: 'Potasio', unit: 'mg' },
  { key: 'calcium_mg', label: 'Calcio', unit: 'mg' },
  { key: 'iron_mg', label: 'Hierro', unit: 'mg' },
  { key: 'vitamin_d_mcg', label: 'Vitamina D', unit: 'mcg' },
];

function toStrings(source: Record<FieldKey, number>) {
  const v: Record<string, string> = {};
  FIELDS.forEach((f) => (v[f.key] = String(source[f.key] ?? '')));
  return v;
}

export default function EditMacrosModal({ visible, onClose, userId, current, reference, onSaved }: Props) {
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
          <Text style={sheetText.kicker}>Macros</Text>
          <Text style={[sheetText.title, { marginBottom: 14 }]}>Tus objetivos</Text>

          <ScrollView style={{ flexShrink: 1 }}>
            {reference ? (
              <View style={styles.whyBox}>
                <Text style={styles.whyTitle}>Recomendación para tu objetivo</Text>
                {reference.why.map((line) => (
                  <Text key={line} style={styles.whyLine}>· {line}</Text>
                ))}
              </View>
            ) : null}

            {FIELDS.map((f) => (
              <View key={f.key} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{f.label}</Text>
                  {reference ? (
                    <Text style={styles.recommended}>
                      Recomendado: {reference[f.key]} {f.unit}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={values[f.key] ?? ''}
                    onChangeText={(t) => setValues((prev) => ({ ...prev, [f.key]: t }))}
                  />
                  <Text style={styles.unit}>{f.unit}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {mismatch ? (
            <Text style={styles.warning}>
              Proteína, carbos y grasas suman {macroKcal} kcal, {kcalGap > 0 ? `${kcalGap} más` : `${-kcalGap} menos`} que
              tu objetivo de calorías. Puedes guardarlo igual, pero no cuadra.
            </Text>
          ) : null}

          {reference ? (
            <Pressable style={styles.resetButton} onPress={() => setValues(toStrings(reference))}>
              <Text style={styles.resetText}>Volver a lo recomendado</Text>
            </Pressable>
          ) : null}

          <PressableScale style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>Guardar</Text>}
          </PressableScale>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  whyBox: {
    backgroundColor: colors.surface2,
    borderLeftWidth: 3,
    borderLeftColor: colors.brass,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  whyTitle: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.brassBright, marginBottom: 2 },
  whyLine: { fontFamily: fonts.body, fontSize: 12.5, color: colors.boneDim, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.bone },
  recommended: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.boneFaint, marginTop: 2 },
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
    color: colors.bone,
    fontFamily: fonts.mono,
    fontSize: 14,
  },
  unit: { fontFamily: fonts.mono, fontSize: 11, color: colors.boneFaint, width: 32 },
  warning: { fontFamily: fonts.body, fontSize: 12, color: colors.brassBright, marginTop: 12, lineHeight: 17 },
  resetButton: { alignItems: 'center', paddingVertical: 10, marginTop: 8 },
  resetText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.brassBright },
  saveButton: { backgroundColor: colors.brass, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
});
