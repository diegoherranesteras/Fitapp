export const colors = {
  bg: '#22100F',
  bgTop: '#2C1517',
  surface: '#321719',
  surface2: '#3B1C1F',
  line: 'rgba(242,232,219,0.12)',
  lineStrong: 'rgba(242,232,219,0.22)',
  bone: '#F2E8DB',
  boneDim: '#C8B6A7',
  boneFaint: '#9B897D',
  brass: '#CFA64E',
  brassBright: '#E6C069',
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
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

export const dayAccents: Record<number, string> = {
  1: '#E2B24E', // Mon
  2: '#E2954A', // Tue
  3: '#E07C42', // Wed
  4: '#DA5C3E', // Thu
  5: '#D75E66', // Fri
  6: '#CF7280', // Sat
  0: '#9B897D', // Sun
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
