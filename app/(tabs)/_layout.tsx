import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts, glow, neon } from '../../lib/theme';
import QuickAddSheet from '../../components/QuickAddSheet';
import PressableScale from '../../components/PressableScale';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <View style={[styles.tabIndicator, focused && styles.tabIndicatorActive]} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: neon.soft,
            borderTopWidth: 1,
            height: 58 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            ...glow(14, 0.35),
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon label="RUTINA" focused={focused} /> }} />
        <Tabs.Screen name="macros" options={{ tabBarIcon: ({ focused }) => <TabIcon label="MACROS" focused={focused} /> }} />
        <Tabs.Screen name="progreso" options={{ tabBarIcon: ({ focused }) => <TabIcon label="PROGRESO" focused={focused} /> }} />
        <Tabs.Screen name="perfil" options={{ tabBarIcon: ({ focused }) => <TabIcon label="PERFIL" focused={focused} /> }} />
      </Tabs>

      <View style={[styles.fabWrap, { bottom: 30 + insets.bottom }]} pointerEvents="box-none">
        <View style={styles.fabRing}>
          <PressableScale style={styles.fab} onPress={() => setAddOpen(true)} accessibilityLabel="Registrar comida o peso">
            <Text style={styles.fabPlus}>+</Text>
          </PressableScale>
        </View>
      </View>

      {session ? (
        <QuickAddSheet visible={addOpen} onClose={() => setAddOpen(false)} userId={session.user.id} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', gap: 6 },
  tabIndicator: { width: 18, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  tabIndicatorActive: { backgroundColor: neon.line, ...glow(8, 0.9) },
  tabLabel: { fontSize: 11, fontFamily: fonts.mono, color: colors.boneFaint },
  tabLabelActive: { color: neon.bright },
  fabWrap: { position: 'absolute', alignSelf: 'center' },
  fabRing: {
    padding: 4,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: neon.soft,
    backgroundColor: colors.bg,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: neon.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...glow(22, 0.85),
  },
  fabPlus: {
    fontSize: 32,
    fontFamily: fonts.bodyBold,
    color: '#FFFFFF',
    marginTop: -3,
  },
});
