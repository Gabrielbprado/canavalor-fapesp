/**
 * Gerador pseudoaleatório com semente explícita.
 *
 * A simulação precisa ser reprodutível: se a banca pedir para rodar de novo, o
 * resultado tem de ser o mesmo número. `Math.random` não permite isso.
 * mulberry32 é curto, rápido e tem qualidade estatística adequada para Monte
 * Carlo de decisão.
 */
export function mulberry32(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
