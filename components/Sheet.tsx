import type { ReactNode } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, glow } from '../lib/theme';
import { useIsWide } from '../lib/layout';
import { useI18n } from '../lib/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Panel para todo lo que se abre encima de una pantalla. En el móvil es una hoja que sube desde abajo
// (donde llega el pulgar); en el ordenador, un diálogo centrado: una hoja de 1400 px de ancho pegada
// al borde inferior se ve rota. El contenido largo debe ir en un ScrollView con flexShrink: 1.
export default function Sheet({ visible, onClose, children }: Props) {
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.overlay, wide && styles.overlayWide]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, wide ? styles.sheetWide : { paddingBottom: 22 + insets.bottom }]}>
          {wide ? null : <View style={styles.handle} />}
          <Pressable style={styles.close} onPress={onClose} hitSlop={12} accessibilityLabel={t('common.close')}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          {children}
        </View>
      </View>
    </Modal>
  );
}

// Estilos compartidos por el contenido de los paneles, para que todos se lean igual. flexShrink: 0 porque,
// cuando el contenido no cabe, lo que se encoge es el ScrollView de debajo, nunca la cabecera.
export const sheetText = StyleSheet.create({
  kicker: { flexShrink: 0, fontFamily: fonts.label, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: colors.accent },
  title: { flexShrink: 0, fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 4, paddingRight: 36 },
  subtitle: { flexShrink: 0, fontFamily: fonts.body, fontSize: 13, color: colors.textDim, marginTop: 4 },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  overlayWide: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
    padding: 22,
    maxHeight: '92%',
  },
  sheetWide: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    paddingBottom: 24,
    ...glow(30, 0.18),
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.lineStrong, alignSelf: 'center', marginTop: -8, marginBottom: 14 },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    zIndex: 2,
  },
  closeText: { color: colors.textDim, fontSize: 14 },
});
