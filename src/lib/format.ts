const cache = new Map<number, Intl.NumberFormat>();

/** Número con coma decimal (es-AR) y cantidad fija de decimales. */
export function fmt(x: number, decimals = 4): string {
  if (!cache.has(decimals)) {
    cache.set(decimals, new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  }
  return cache.get(decimals)!.format(x);
}

/** Valor bruto de un criterio con el formato adecuado a su unidad. */
export function fmtRaw(x: number, code: string): string {
  if (code === 'C3') return new Intl.NumberFormat('es-AR').format(x);
  if (code === 'C5' || code === 'C6') return String(x);
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 }).format(x);
}

export function fmtTokens(x: number): string {
  if (x >= 1_000_000) return `${fmt(x / 1_000_000, x % 1_000_000 === 0 ? 0 : 2)}M`;
  if (x >= 1000) return `${fmt(x / 1000, 0)}K`;
  return String(x);
}

export const pct = (w: number, decimals = 1) => `${fmt(w * 100, decimals)} %`;
