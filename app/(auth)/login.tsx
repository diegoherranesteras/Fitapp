import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, fonts } from '../../lib/theme';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Rellena email y contraseña.');
      return;
    }
    setBusy(true);
    const { error: err } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (err) setError(err.message);
    else if (mode === 'signup') {
      setError('Cuenta creada. Si tu proyecto de Supabase pide confirmar el email, revisa tu bandeja antes de entrar.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Rutina</Text>
        <Text style={styles.title}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="tu@email.com"
            placeholderTextColor={colors.boneFaint}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.boneFaint}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          <Text style={styles.switchText}>
            {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: colors.brass,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.bone,
    textTransform: 'uppercase',
    marginBottom: 32,
  },
  field: { marginBottom: 18 },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.boneDim,
    marginBottom: 6,
  },
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
  error: {
    color: colors.bloodBright,
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.brass,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.bg,
  },
  switchText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.boneDim,
    textAlign: 'center',
    marginTop: 20,
  },
});
