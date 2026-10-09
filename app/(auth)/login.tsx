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
import { colors, fonts, glow, neon } from '../../lib/theme';
import PressableScale from '../../components/PressableScale';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
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
      <View style={styles.decor}>
        <View style={[styles.tube, { top: 38, left: -20, width: 150 }]} />
        <View style={[styles.tube, { top: 38, right: -20, width: 150 }]} />
        <View style={[styles.tube, styles.tubeFaint, { bottom: 70, left: 40, right: 40 }]} />
      </View>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Rutina</Text>
        <Text style={styles.title}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
        <View style={styles.titleLine} />

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, focused === 'email' && styles.inputFocused]}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="tu@email.com"
            placeholderTextColor={colors.textFaint}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={[styles.input, focused === 'password' && styles.inputFocused]}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textFaint}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PressableScale style={styles.button} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.buttonText}>{mode === 'login' ? 'Entrar' : 'Crear cuenta'}</Text>
          )}
        </PressableScale>

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
  // En el ordenador el formulario no se estira: columna estrecha y centrada.
  container: { flexGrow: 1, justifyContent: 'center', padding: 28, width: '100%', maxWidth: 440, alignSelf: 'center' },
  eyebrow: {
    fontFamily: fonts.label,
    fontSize: 12,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.text,
    textTransform: 'uppercase',
  },
  titleLine: { height: 2, width: 96, borderRadius: 1, backgroundColor: neon.line, marginTop: 8, marginBottom: 32, ...glow(10, 0.9) },
  decor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' },
  tube: { position: 'absolute', height: 3, borderRadius: 2, backgroundColor: neon.bright, opacity: 0.9, ...glow(22, 0.9) },
  tubeFaint: { height: 2, opacity: 0.3 },
  inputFocused: { borderColor: neon.line, ...glow(10, 0.4) },
  field: { marginBottom: 18 },
  label: {
    fontFamily: fonts.label,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textDim,
    marginBottom: 6,
  },
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
  error: {
    color: colors.bloodBright,
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.accent,
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
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 20,
  },
});
