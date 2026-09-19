import { useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/theme';

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

export default function QuickAddSheet({ visible, onClose, userId }: Props) {
  const [step, setStep] = useState<Step>('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const [weight, setWeight] = useState('');

  function reset() {
    setStep('menu');
    setError(null);
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setWeight('');
  }

  function close() {
    reset();
    onClose();
  }

  async function saveFood() {
    if (!foodName.trim() || !calories) {
      setError('Pon al menos nombre y calorías.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from('food_logs').insert({
      user_id: userId,
      date: todayISO(),
      name: foodName.trim(),
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
    });
    setBusy(false);
    if (err) setError(err.message);
    else close();
  }

  async function saveWeight() {
    if (!weight) {
      setError('Pon tu peso.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase
      .from('weight_logs')
      .upsert({ user_id: userId, date: todayISO(), weight_kg: Number(weight) }, { onConflict: 'user_id,date' });
    setBusy(false);
    if (err) setError(err.message);
    else close();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {step === 'menu' && (
            <>
              <Text style={styles.title}>Registrar</Text>
              <Pressable style={styles.optionButton} onPress={() => setStep('food')}>
                <Text style={styles.optionIcon}>🍽️</Text>
                <Text style={styles.optionText}>Registrar comida</Text>
              </Pressable>
              <Pressable style={styles.optionButton} onPress={() => setStep('weight')}>
                <Text style={styles.optionIcon}>⚖️</Text>
                <Text style={styles.optionText}>Registrar peso</Text>
              </Pressable>
            </>
          )}

          {step === 'food' && (
            <>
              <Text style={styles.title}>Registrar comida</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre (ej. Pechuga con arroz)"
                placeholderTextColor={colors.boneFaint}
                value={foodName}
                onChangeText={setFoodName}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  placeholder="kcal"
                  placeholderTextColor={colors.boneFaint}
                  keyboardType="numeric"
                  value={calories}
                  onChangeText={setCalories}
                />
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  placeholder="prot g"
                  placeholderTextColor={colors.boneFaint}
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  placeholder="carbs g"
                  placeholderTextColor={colors.boneFaint}
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
                <TextInput
                  style={[styles.input, styles.inputSmall]}
                  placeholder="grasa g"
                  placeholderTextColor={colors.boneFaint}
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.saveButton} onPress={saveFood} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>Guardar</Text>}
              </Pressable>
            </>
          )}

          {step === 'weight' && (
            <>
              <Text style={styles.title}>Registrar peso</Text>
              <TextInput
                style={styles.input}
                placeholder="Peso en kg"
                placeholderTextColor={colors.boneFaint}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable style={styles.saveButton} onPress={saveWeight} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>Guardar</Text>}
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(9,4,4,0.68)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.bone,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  optionIcon: { fontSize: 22 },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.bone },
  input: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.bone,
    fontFamily: fonts.body,
    fontSize: 16,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  inputSmall: { flex: 1 },
  error: { color: colors.bloodBright, fontFamily: fonts.body, fontSize: 13, marginBottom: 10 },
  saveButton: {
    backgroundColor: colors.brass,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.bg },
});
