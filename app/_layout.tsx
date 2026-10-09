import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from '@expo-google-fonts/hanken-grotesk';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { I18nProvider } from '../lib/i18n';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const { session, loading, onboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
      return;
    }
    if (onboarded === null) return; // perfil aún cargando
    if (!onboarded && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboarded && inAuthGroup) {
      router.replace('/(tabs)');
    }
    // Un usuario ya incorporado puede estar en /onboarding a propósito ("Rehacer mi plan"): no se le saca.
  }, [session, loading, onboarded, segments]);

  if (loading || (session && onboarded === null)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
