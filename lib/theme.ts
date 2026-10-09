// Negro de base con azules: el azul sólido (accent) para botones y selección; el neón para luz y líneas.
export const colors = {
  bg: '#050607',
  bgTop: '#0A0C0F',
  surface: '#0F1216',
  surface2: '#171B21',
  line: 'rgba(220,230,245,0.10)',
  lineStrong: 'rgba(220,230,245,0.20)',
  text: '#EEF2F7',
  textDim: '#AAB3BF',
  textFaint: '#6F7885',
  accent: '#3D8BFF',
  accentBright: '#8FC2FF',
  blood: '#DA4030',
  bloodBright: '#F05543',
  protein: '#F05543',
  carbs: '#8FD19E',
  fat: '#6FB7E0',
  good: '#5FA06A',
};

// Azul neón: se usa como luz (líneas finas y halos), nunca como relleno de grandes superficies.
export const neon = {
  line: '#2FA8FF',
  bright: '#8FD3FF',
  soft: 'rgba(47,168,255,0.55)',
  faint: 'rgba(47,168,255,0.14)',
};

// Dos capas, como un tubo de neón real: brillo pegado al tubo y resplandor amplio alrededor.
export function glow(blur = 12, alpha = 0.6, color = '47,168,255') {
  const core = Math.max(2, Math.round(blur / 3));
  return {
    boxShadow: `0 0 ${core}px rgba(${color},${Math.min(1, alpha * 1.2)}), 0 0 ${blur}px ${Math.round(blur / 6)}px rgba(${color},${alpha * 0.6})`,
  };
}

export const fonts = {
  display: 'Anton_400Regular',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
  // Etiquetas en mayúsculas, horas y cifras pequeñas.
  label: 'HankenGrotesk_600SemiBold',
  labelBold: 'HankenGrotesk_700Bold',
};

// Un azul por día, de celeste (lunes) a violeta (sábado); el domingo, gris.
export const dayAccents: Record<number, string> = {
  1: '#8FD3FF', // Mon
  2: '#6CC0FF', // Tue
  3: '#4FA9FF', // Wed
  4: '#3D8BFF', // Thu
  5: '#5B7CFF', // Fri
  6: '#7B6CFF', // Sat
  0: '#6F7885', // Sun
};

export const dayLabels: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  0: 'Dom',
};
