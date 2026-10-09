// En la base de datos todo el peso va en kg; la unidad del perfil solo cambia cómo se muestra y se escribe.
export type WeightUnit = 'kg' | 'lb';

const LB_PER_KG = 2.20462;

export function toUnit(kg: number, unit: WeightUnit) {
  return unit === 'lb' ? kg * LB_PER_KG : kg;
}

export function fromUnit(value: number, unit: WeightUnit) {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

// Redondeo a 0,1 para mostrar; sin ceros de sobra ("80" y no "80.0").
export function formatWeight(kg: number, unit: WeightUnit) {
  return String(Math.round(toUnit(kg, unit) * 10) / 10);
}

// Lo que escribe la persona ("82,5") en kg con 2 decimales, o null si no es un número válido.
export function parseWeight(text: string, unit: WeightUnit): number | null {
  const n = Number(text.replace(',', '.'));
  if (!text.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(fromUnit(n, unit) * 100) / 100;
}
