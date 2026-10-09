import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';

interface Props {
  children: ReactNode;
  // Ancho máximo del contenido: en el ordenador las pantallas no se estiran a 1900 px.
  maxWidth?: number;
}

export default function Screen({ children, maxWidth = 760 }: Props) {
  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={[styles.column, { maxWidth }]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', alignSelf: 'center' },
});
