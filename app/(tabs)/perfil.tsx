import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts, glow, neon } from '../../lib/theme';
import PressableScale from '../../components/PressableScale';
import Screen from '../../components/Screen';
import { SettingsButton } from '../../components/SettingsSheet';
import { useI18n } from '../../lib/i18n';

export default function PerfilScreen() {
  const { session, refreshProfile } = useAuth();
  const { t } = useI18n();
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
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading) {
    return (
      <Screen>
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={560}>
      <View style={{ padding: 22 }}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('profile.eyebrow')}</Text>
          <SettingsButton />
        </View>
        <Text style={styles.email}>{session?.user.email}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.name')}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder={t('profile.namePlaceholder')} placeholderTextColor={colors.textFaint} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.unit')}</Text>
          <Text style={styles.unitHint}>{t('profile.unitHint')}</Text>
          <View style={styles.unitRow}>
            {(['kg', 'lb'] as const).map((u) => (
              <PressableScale key={u} onPress={() => setWeightUnit(u)} style={[styles.unitButton, weightUnit === u && styles.unitButtonActive]}>
                <Text style={[styles.unitText, weightUnit === u && styles.unitTextActive]}>{u}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <PressableScale style={styles.saveButton} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.saveText}>{saved ? t('common.saved') : t('common.save')}</Text>}
        </PressableScale>

        <PressableScale style={styles.redoButton} onPress={() => router.push('/onboarding')}>
          <Text style={styles.redoText}>{t('profile.redo')}</Text>
          <Text style={styles.redoHint}>{t('profile.redoHint')}</Text>
        </PressableScale>

        <Pressable style={styles.signOutButton} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: colors.accent },
  email: { fontFamily: fonts.body, fontSize: 14, color: colors.textDim, marginTop: 6, marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontFamily: fonts.label, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.textDim, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  unitHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textFaint, marginTop: -2, marginBottom: 10 },
  unitRow: { flexDirection: 'row', gap: 10 },
  unitButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  unitButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  unitText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textDim },
  unitTextActive: { color: colors.bg },
  saveButton: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
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
  redoHint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textFaint, lineHeight: 18 },
  signOutButton: { marginTop: 28, alignItems: 'center' },
  signOutText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bloodBright },
});
