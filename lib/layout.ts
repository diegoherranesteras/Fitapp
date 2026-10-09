import { useWindowDimensions } from 'react-native';

// A partir de este ancho (tablet en horizontal, portátil) la app pasa a diseño de escritorio:
// barra lateral en vez de pestañas abajo, semana completa a la vista y paneles centrados.
export const WIDE_BREAKPOINT = 900;

export function useIsWide() {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
