/**
 * Distribuições de amostragem.
 *
 * Os documentos do projeto pedem "simulação de cenários de preço e mix" e
 * resultado "como intervalo", sem especificar a distribuição. Adotamos a
 * triangular: com poucos dados, ela é a escolha transparente — pede apenas
 * mínimo, mais provável e máximo, três números que um analista de mercado
 * consegue defender, em vez de uma média e um desvio que ninguém mediu.
 */

export interface Triangular {
  min: number;
  moda: number;
  max: number;
}

/** Amostragem por inversão da acumulada. */
export function amostrarTriangular(t: Triangular, u: number): number {
  const { min: a, moda: c, max: b } = t;
  if (b <= a) return a;
  const fc = (c - a) / (b - a);
  return u < fc
    ? a + Math.sqrt(u * (b - a) * (c - a))
    : b - Math.sqrt((1 - u) * (b - a) * (b - c));
}

export const mediaTriangular = (t: Triangular) => (t.min + t.moda + t.max) / 3;

/** Percentil por interpolação linear sobre a amostra ordenada. */
export function percentil(ordenada: Float64Array, p: number): number {
  const n = ordenada.length;
  if (n === 0) return NaN;
  if (n === 1) return ordenada[0];
  const pos = (n - 1) * p;
  const i = Math.floor(pos);
  const frac = pos - i;
  return i + 1 < n ? ordenada[i] * (1 - frac) + ordenada[i + 1] * frac : ordenada[i];
}
