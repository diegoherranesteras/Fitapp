import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts, glow, neon } from '../../lib/theme';
import PressableScale from '../../components/PressableScale';

export default function PerfilScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).maybeSingle();
    if (data) {
      setName(data.name ?? '');
      setWeightUnit(data.weight_unit ?? 'kg');
    }
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save() {
    if (!session) return;
    setSaving(true);
    await supabase.from('profiles').upsert({ user_id: session.user.id, name, weight_unit: weightUnit }, { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, styles.center]}>
        <ActivityIndicator color={colors.brass} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={{ padding: 22 }}>
        <Text style={styles.eyebrow}>Perfil</Text>
        <Text style={styles.email}>{session?.user.email}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Tu nombre" placeholderTextColor={colors.boneFaint} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Unidad de peso</Text>
          <View style={styles.unitRow}>
            {(['kg', 'lb'] as const).map((u) => (
              <Pressable key={u} onPress={() => setWeightUnit(u)} style={[styles.unitButton, weightUnit === u && styles.unitButtonActive]}>
                <Text style={[styles.unitText, weightUnit === u && styles.unitTextActive]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable style={styles.saveButton} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>{saved ? 'Guardado ✓' : 'Guardar'}</Text>}
        </Pressable>

        <PressableScale style={styles.redoButton} onPress={() => router.push('/onboarding')}>
          <Text style={styles.redoText}>Rehacer mi plan</Text>
          <Text style={styles.redoHint}>Vuelve a responder el cuestionario y te creamos una semana nueva con tus macros.</Text>
        </PressableScale>

        <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.brass },
  email: { fontFamily: fonts.body, fontSize: 14, color: colors.boneDim, marginTop: 6, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.boneDim, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.bone,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  unitRow: { flexDirection: 'row', gap: 10 },
  unitButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  unitButtonActive: { backgroundColor: colors.brass, borderColor: colors.brass },
  unitText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.boneDim },
  unitTextActive: { color: colors.bg },
  saveButton: { backgroundColor: colors.brass, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.bg },
  redoButton: {
    marginTop: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: neon.line,
    borderRadius: 12,
    padding: 16,
    gap: 4,
    ...glow(14, 0.45),
  },
  redoText: { fontFamily: fonts.bodyBold, fontSize: 15, color: neon.bright },
  redoHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.boneFaint, lineHeight: 18 },
  signOutButton: { marginTop: 28, alignItems: 'center' },
  signOutText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bloodBright },
});
