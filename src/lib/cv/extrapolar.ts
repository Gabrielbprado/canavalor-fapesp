/**
 * Da massa detectada na parcela para kg/ha e para a severidade CTC.
 *
 * A unidade que interessa ao produtor não é a massa na armação, é R$/ha. Esta
 * é a ponte entre a imagem e o motor CONSECANA.
 */

import { CLASSES, type ClassePerda, classificarSeveridade } from '../dominio';
import type { Deteccao } from './tipos';

export interface ResultadoParcela {
  massaTotalKg: number;
  massaMinKg: number;
  massaMaxKg: number;
  perdaKgHa: number;
  perdaKgHaMin: number;
  perdaKgHaMax: number;
  percentual: number;
  severidade: ReturnType<typeof classificarSeveridade>;
  porClasse: Record<ClassePerda, { contagem: number; massaKg: number; kgHa: number }>;
  agregados: number;
  areaAmostraM2: number;
}

const M2_POR_HA = 10_000;

export function consolidarParcela(
  deteccoes: Deteccao[],
  areaAmostraM2: number,
  produtividadeTHa: number,
): ResultadoParcela {
  const porClasse = Object.fromEntries(
    CLASSES.map((c) => [c, { contagem: 0, massaKg: 0, kgHa: 0 }]),
  ) as ResultadoParcela['porClasse'];

  let massaTotalKg = 0;
  let varianciaKg2 = 0;
  let agregados = 0;

  for (const d of deteccoes) {
    massaTotalKg += d.massaKg;
    // Incertezas por fragmento somadas em quadratura, não linearmente
    const sigma = (d.massaMaxKg - d.massaMinKg) / 2;
    varianciaKg2 += sigma * sigma;

    if (d.classe === 'agregado') {
      agregados++;
      continue;
    }
    if (d.classe === 'rejeitado') continue;

    porClasse[d.classe].contagem++;
    porClasse[d.classe].massaKg += d.massaKg;
  }

  const fator = M2_POR_HA / areaAmostraM2;
  for (const c of CLASSES) porClasse[c].kgHa = porClasse[c].massaKg * fator;

  const sigmaTotal = Math.sqrt(varianciaKg2);
  const perdaKgHa = massaTotalKg * fator;
  const percentual = (perdaKgHa / (produtividadeTHa * 1000)) * 100;

  return {
    massaTotalKg,
    massaMinKg: Math.max(0, massaTotalKg - sigmaTotal),
    massaMaxKg: massaTotalKg + sigmaTotal,
    perdaKgHa,
    perdaKgHaMin: Math.max(0, massaTotalKg - sigmaTotal) * fator,
    perdaKgHaMax: (massaTotalKg + sigmaTotal) * fator,
    percentual,
    severidade: classificarSeveridade(percentual),
    porClasse,
    agregados,
    areaAmostraM2,
  };
}

/**
 * Agregação das repetições, como no método da armação: 4 quadros em pontos
 * aleatórios. O CV alto é o sinal, conhecido em campo, de que a amostragem
 * ainda não representa o talhão.
 */
export interface EstatisticaRepeticoes {
  n: number;
  mediaPct: number;
  desvioPct: number;
  cvPct: number;
  ic95: [number, number];
  variabilidadeAlta: boolean;
}

/** t de Student a 95%, bilateral, para n−1 graus de liberdade. */
const T_95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228];

export function agregarRepeticoes(percentuais: number[]): EstatisticaRepeticoes | null {
  const n = percentuais.length;
  if (n === 0) return null;

  const media = percentuais.reduce((a, b) => a + b, 0) / n;
  if (n === 1) {
    return { n, mediaPct: media, desvioPct: 0, cvPct: 0, ic95: [media, media], variabilidadeAlta: false };
  }

  const desvio = Math.sqrt(
    percentuais.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1),
  );
  const t = T_95[Math.min(n - 2, T_95.length - 1)];
  const erro = (t * desvio) / Math.sqrt(n);
  const cv = media > 0 ? (desvio / media) * 100 : 0;

  return {
    n,
    mediaPct: media,
    desvioPct: desvio,
    cvPct: cv,
    ic95: [Math.max(0, media - erro), media + erro],
    variabilidadeAlta: cv > 25,
  };
}
