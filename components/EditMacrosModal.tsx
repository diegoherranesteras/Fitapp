import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';
import type { MacroTargets } from '../lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
  current: MacroTargets | null;
  onSaved: (t: MacroTargets) => void;
}

const FIELDS: { key: keyof MacroTargets; label: string; unit: string }[] = [
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

export default function EditMacrosModal({ visible, onClose, userId, current, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) {
      const v: Record<string, string> = {};
      FIELDS.forEach((f) => (v[f.key] = String(current[f.key] ?? '')));
      setValues(v);
    }
  }, [current, visible]);

  async function save() {
    setSaving(true);
    const payload: any = { user_id: userId };
    FIELDS.forEach((f) => (payload[f.key] = Number(values[f.key]) || 0));
    const { data, error } = await supabase.from('macro_targets').upsert(payload, { onConflict: 'user_id' }).select().single();
    setSaving(false);
    if (!error && data) {
      onSaved(data as MacroTargets);
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Editar objetivos</Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {FIELDS.map((f) => (
              <View key={f.key} style={styles.row}>
                <Text style={styles.label}>{f.label}</Text>
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
          <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>Guardar</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(9,4,4,0.68)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, paddingBottom: 34 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.bone, textTransform: 'uppercase', marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  label: { fontFamily: fonts.body, fontSize: 14, color: colors.bone },
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
  saveButton: { backgroundColor: colors.brass, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
});
