import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
import { emitDataChanged } from '../lib/events';
import { parseWeight } from '../lib/units';
import { colors, fonts, neon } from '../lib/theme';
import Sheet, { sheetText } from './Sheet';
import PressableScale from './PressableScale';

interface Props {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

type Step = 'menu' | 'food' | 'weight';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MACRO_FIELDS = [
  { key: 'calories', label: 'Calorías', unit: 'kcal', color: neon.bright },
  { key: 'protein', label: 'Proteína', unit: 'g', color: colors.protein },
  { key: 'carbs', label: 'Carbos', unit: 'g', color: colors.carbs },
  { key: 'fat', label: 'Grasas', unit: 'g', color: colors.fat },
] as const;
type MacroKey = (typeof MACRO_FIELDS)[number]['key'];

export default function QuickAddSheet({ visible, onClose, userId }: Props) {
  const { weightUnit } = useAuth();
  const [step, setStep] = useState<Step>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [macros, setMacros] = useState<Record<MacroKey, string>>({ calories: '', protein: '', carbs: '', fat: '' });
  const [weight, setWeight] = useState('');

  function close() {
    setStep('menu');
    setError(null);
    setFoodName('');
    setMacros({ calories: '', protein: '', carbs: '', fat: '' });
    setWeight('');
    onClose();
  }

  const n = (s: string) => Number(s.replace(',', '.')) || 0;

  async function saveFood() {
    if (!foodName.trim() || !macros.calories) {
      setError('Pon al menos nombre y calorías.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('food_logs').insert({
      user_id: userId,
      date: todayISO(),
      name: foodName.trim(),
      calories: Math.round(n(macros.calories)),
      protein_g: n(macros.protein),
      carbs_g: n(macros.carbs),
      fat_g: n(macros.fat),
    });
    setBusy(false);
    if (err) return setError(err.message);
    emitDataChanged();
    close();
  }

  async function saveWeight() {
    const kg = parseWeight(weight, weightUnit);
    if (kg == null) {
      setError('Pon tu peso.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from('weight_logs')
      .upsert({ user_id: userId, date: todayISO(), weight_kg: kg }, { onConflict: 'user_id,date' });
    setBusy(false);
    if (err) return setError(err.message);
    emitDataChanged();
    close();
  }

  return (
    <Sheet visible={visible} onClose={close}>
      {step === 'menu' && (
        <>
          <Text style={sheetText.kicker}>Hoy</Text>
          <Text style={[sheetText.title, { marginBottom: 16 }]}>Registrar</Text>
          <Option icon="🍽️" title="Comida" hint="Lo que has comido fuera del plan o tal cual" onPress={() => setStep('food')} />
          <Option icon="⚖️" title="Peso" hint="Mejor en ayunas, después del baño" onPress={() => setStep('weight')} />
        </>
      )}

      {step === 'food' && (
        <>
          <Text style={sheetText.kicker}>Registrar</Text>
          <Text style={[sheetText.title, { marginBottom: 16 }]}>Comida</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre (ej. Pechuga con arroz)"
            placeholderTextColor={colors.textFaint}
            value={foodName}
            onChangeText={setFoodName}
            autoFocus
          />
          <View style={styles.grid}>
            {MACRO_FIELDS.map((f) => (
              <View key={f.key} style={styles.gridItem}>
                <Text style={[styles.fieldLabel, { color: f.color }]}>{f.label}</Text>
                <View style={styles.fieldRow}>
                  <TextInput
                    style={[styles.input, styles.inputNumber]}
                    placeholder="0"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                    value={macros[f.key]}
                    onChangeText={(v) => setMacros((m) => ({ ...m, [f.key]: v }))}
                  />
                  <Text style={styles.unit}>{f.unit}</Text>
                </View>
              </View>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Actions busy={busy} onBack={() => { setError(null); setStep('menu'); }} onSave={saveFood} />
        </>
      )}

      {step === 'weight' && (
        <>
          <Text style={sheetText.kicker}>Registrar</Text>
          <Text style={[sheetText.title, { marginBottom: 16 }]}>Peso de hoy</Text>
          <View style={styles.fieldRow}>
            <TextInput
              style={[styles.input, styles.bigInput]}
              placeholder="0,0"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              autoFocus
            />
            <Text style={styles.bigUnit}>{weightUnit}</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Actions busy={busy} onBack={() => { setError(null); setStep('menu'); }} onSave={saveWeight} />
        </>
      )}
    </Sheet>
  );
}

function Option({ icon, title, hint, onPress }: { icon: string; title: string; hint: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.option} onPress={onPress}>
      <Text style={styles.optionIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionHint}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
}

function Actions({ busy, onBack, onSave }: { busy: boolean; onBack: () => void; onSave: () => void }) {
  return (
    <View style={styles.actions}>
      <PressableScale wrapperStyle={{ flex: 1 }} style={styles.back} onPress={onBack} disabled={busy}>
        <Text style={styles.backText}>Atrás</Text>
      </PressableScale>
      <PressableScale wrapperStyle={{ flex: 2 }} style={styles.save} onPress={onSave} disabled={busy}>
        {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>Guardar</Text>}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  optionIcon: { fontSize: 24 },
  optionTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  optionHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textFaint, marginTop: 2 },
  chevron: { color: colors.textFaint, fontSize: 22 },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  gridItem: { flexBasis: '47%', flexGrow: 1 },
  fieldLabel: { fontFamily: fonts.label, fontSize: 10.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputNumber: { flex: 1, minWidth: 0, fontFamily: fonts.label },
  unit: { fontFamily: fonts.label, fontSize: 11, color: colors.textFaint, width: 28 },
  bigInput: { flex: 1, fontFamily: fonts.display, fontSize: 40, paddingVertical: 8, textAlign: 'center' },
  bigUnit: { fontFamily: fonts.label, fontSize: 16, color: colors.textDim, width: 34 },
  error: { color: colors.bloodBright, fontFamily: fonts.body, fontSize: 13, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  back: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.lineStrong },
  backText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textDim },
  save: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.bg },
});
