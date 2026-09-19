import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth-context';
import { colors, fonts } from '../../lib/theme';
import QuickAddSheet from '../../components/QuickAddSheet';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: fonts.mono, color: focused ? colors.brassBright : colors.boneFaint }}>
      {label}
    </Text>
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
            borderTopColor: colors.line,
            height: 58 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon label="RUTINA" focused={focused} /> }} />
        <Tabs.Screen name="macros" options={{ tabBarIcon: ({ focused }) => <TabIcon label="MACROS" focused={focused} /> }} />
        <Tabs.Screen name="progreso" options={{ tabBarIcon: ({ focused }) => <TabIcon label="PROGRESO" focused={focused} /> }} />
        <Tabs.Screen name="perfil" options={{ tabBarIcon: ({ focused }) => <TabIcon label="PERFIL" focused={focused} /> }} />
      </Tabs>

      <Pressable
        style={[styles.fab, { bottom: 30 + insets.bottom }]}
        onPress={() => setAddOpen(true)}
        hitSlop={10}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>

      {session ? (
        <QuickAddSheet visible={addOpen} onClose={() => setAddOpen(false)} userId={session.user.id} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brass,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPlus: {
    fontSize: 30,
    fontFamily: fonts.bodyBold,
    color: colors.bg,
    marginTop: -2,
  },
});
