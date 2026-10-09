import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { useIsWide } from '../../lib/layout';
import { colors, fonts, glow, neon } from '../../lib/theme';
import QuickAddSheet from '../../components/QuickAddSheet';
import PressableScale from '../../components/PressableScale';

const LABELS: Record<string, string> = { index: 'Rutina', macros: 'Macros', progreso: 'Progreso', perfil: 'Perfil' };

// Lo mínimo que usamos de las props que el navegador de pestañas pasa a `tabBar`.
interface NavProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
}

// Móvil: barra inferior con el + flotando en el centro, al alcance del pulgar.
function BottomBar({ state, navigation, onAdd }: NavProps & { onAdd: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View>
      <View style={[styles.bottomBar, { height: 58 + insets.bottom, paddingBottom: insets.bottom }]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          // Hueco central para el botón +.
          const spacer = i === 2 ? <View key="fab-gap" style={{ width: 72 }} /> : null;
          return [
            spacer,
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.bottomItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
            >
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
              <Text style={[styles.bottomLabel, focused && styles.labelActive]}>{LABELS[route.name].toUpperCase()}</Text>
            </Pressable>,
          ];
        })}
      </View>
      <View style={[styles.fabWrap, { bottom: 22 + insets.bottom }]}>
        <View style={styles.fabRing}>
          <PressableScale style={styles.fab} onPress={onAdd} accessibilityLabel="Registrar comida o peso">
            <Text style={styles.fabPlus}>+</Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

// Ordenador: barra lateral con la marca, la navegación y el botón de registrar siempre visible.
function SideBar({ state, navigation, onAdd }: NavProps & { onAdd: () => void }) {
  return (
    <View style={styles.sideBar}>
      <Text style={styles.brand}>Rutina</Text>
      <View style={styles.brandLine} />
      <View style={{ gap: 4, marginTop: 28 }}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={(s) => [styles.sideItem, (s as { hovered?: boolean }).hovered && !focused && styles.sideItemHover, focused && styles.sideItemActive]}
            >
              <View style={[styles.sideIndicator, focused && styles.indicatorActive]} />
              <Text style={[styles.sideLabel, focused && styles.labelActive]}>{LABELS[route.name]}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <PressableScale style={styles.sideAdd} onPress={onAdd}>
        <Text style={styles.sideAddPlus}>+</Text>
        <Text style={styles.sideAddText}>Registrar</Text>
      </PressableScale>
    </View>
  );
}

export default function TabsLayout() {
  const [addOpen, setAddOpen] = useState(false);
  const { session } = useAuth();
  const wide = useIsWide();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'bottom', animation: 'none' }}
        tabBar={(props) =>
          wide ? (
            <SideBar {...(props as unknown as NavProps)} onAdd={() => setAddOpen(true)} />
          ) : (
            <BottomBar {...(props as unknown as NavProps)} onAdd={() => setAddOpen(true)} />
          )
        }
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="macros" />
        <Tabs.Screen name="progreso" />
        <Tabs.Screen name="perfil" />
      </Tabs>

      {session ? <QuickAddSheet visible={addOpen} onClose={() => setAddOpen(false)} userId={session.user.id} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: neon.soft,
    paddingTop: 6,
    ...glow(14, 0.35),
  },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  indicator: { width: 18, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: neon.line, ...glow(8, 0.9) },
  bottomLabel: { fontSize: 10.5, fontFamily: fonts.label, color: colors.textFaint },
  labelActive: { color: neon.bright },
  fabWrap: { position: 'absolute', alignSelf: 'center', pointerEvents: 'box-none' },
  fabRing: { padding: 4, borderRadius: 36, borderWidth: 1, borderColor: neon.soft, backgroundColor: colors.bg },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: neon.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...glow(22, 0.85),
  },
  fabPlus: { fontSize: 32, fontFamily: fonts.bodyBold, color: '#FFFFFF', marginTop: -3 },

  sideBar: {
    width: 232,
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 24,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: neon.soft,
    ...glow(18, 0.25),
  },
  brand: { fontFamily: fonts.display, fontSize: 34, color: colors.text, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 10 },
  brandLine: { height: 2, width: 56, marginLeft: 10, marginTop: 8, backgroundColor: neon.line, borderRadius: 1, ...glow(10, 0.9) },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  sideItemHover: { backgroundColor: 'rgba(255,255,255,0.04)' },
  sideItemActive: { backgroundColor: colors.surface2 },
  sideIndicator: { width: 3, height: 18, borderRadius: 2, backgroundColor: 'transparent' },
  sideLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textDim },
  sideAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: neon.line,
    ...glow(18, 0.7),
  },
  sideAddPlus: { fontFamily: fonts.bodyBold, fontSize: 20, color: '#FFFFFF', marginTop: -2 },
  sideAddText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#FFFFFF' },
});
