/** Formatação numérica no padrão brasileiro, usada em toda a interface. */

export const num = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const brl = (v: number, casas = 2) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

/** Valores grandes em reais, compactados para caber nos cartões do painel. */
export function brlCompacto(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${num(v / 1_000_000, 2)} mi`;
  if (Math.abs(v) >= 10_000) return `R$ ${num(v / 1000, 1)} mil`;
  return brl(v, 0);
}

export const pct = (v: number, casas = 2) => `${num(v, casas)}%`;
