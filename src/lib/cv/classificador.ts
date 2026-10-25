/**
 * Classificação geométrica dos fragmentos nas cinco classes de perda.
 *
 * Duas peças que se conferem mutuamente: uma árvore de decisão determinística,
 * que produz o rótulo, e um conjunto de perfis fuzzy trapezoidais, que produz a
 * confiança. Quando as duas discordam, a detecção é marcada como ambígua e a
 * confiança é rebaixada — em vez de escondermos a discordância.
 *
 * Todos os limiares aqui são iniciais, derivados das dimensões físicas
 * declaradas em `dominio.ts`. Serão substituídos pelo detector treinado da
 * Fase 2 do projeto.
 */

import { type ClassePerda, MODELO_MASSA, PERFIS } from '../dominio';
import type { Componente, Deteccao } from './tipos';

export type Rotulo = ClassePerda | 'agregado' | 'rejeitado';

export interface Trapezio {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Pertinência trapezoidal: 0 fora de [a,d], 1 no platô [b,c]. */
export function pertinencia(x: number, t: Trapezio): number {
  if (x <= t.a || x >= t.d) return 0;
  if (x < t.b) return (x - t.a) / (t.b - t.a);
  if (x <= t.c) return 1;
  return (t.d - x) / (t.d - t.c);
}

interface PerfilFuzzy {
  comprimento: Trapezio;
  razao: Trapezio;
  largura: Trapezio;
  solidez: Trapezio;
  /** a* × 10; negativo indica verde. */
  aLab: Trapezio;
}

export const PERFIS_FUZZY: Record<ClassePerda, PerfilFuzzy> = {
  inteira: {
    comprimento: { a: 90, b: 135, c: 320, d: 400 },
    razao: { a: 25, b: 40, c: 120, d: 200 },
    largura: { a: 1.8, b: 2.5, c: 4.2, d: 5.5 },
    solidez: { a: 0.5, b: 0.72, c: 1, d: 1 },
    aLab: { a: 5, b: 20, c: 180, d: 280 },
  },
  tolete: {
    comprimento: { a: 12, b: 18, c: 45, d: 65 },
    razao: { a: 4, b: 6, c: 16, d: 26 },
    largura: { a: 1.8, b: 2.4, c: 4.2, d: 5.5 },
    solidez: { a: 0.55, b: 0.78, c: 1, d: 1 },
    aLab: { a: 5, b: 20, c: 180, d: 280 },
  },
  toco: {
    comprimento: { a: 5, b: 8, c: 17, d: 24 },
    razao: { a: 1.2, b: 1.6, c: 4.5, d: 7 },
    largura: { a: 2.0, b: 2.9, c: 6.0, d: 8.0 },
    solidez: { a: 0.68, b: 0.85, c: 1, d: 1 },
    aLab: { a: 5, b: 20, c: 180, d: 280 },
  },
  ponta: {
    comprimento: { a: 24, b: 36, c: 88, d: 130 },
    razao: { a: 11, b: 17, c: 50, d: 85 },
    largura: { a: 0.8, b: 1.3, c: 2.8, d: 3.6 },
    solidez: { a: 0.3, b: 0.5, c: 1, d: 1 },
    aLab: { a: -400, b: -300, c: 20, d: 80 },
  },
  lasca: {
    comprimento: { a: 1.5, b: 2.5, c: 11, d: 16 },
    razao: { a: 1, b: 1.5, c: 8, d: 13 },
    largura: { a: 0.2, b: 0.45, c: 2.3, d: 3.1 },
    solidez: { a: 0, b: 0, c: 0.82, d: 0.95 },
    aLab: { a: 5, b: 20, c: 190, d: 300 },
  },
};

const PESOS = { comprimento: 0.42, razao: 0.24, largura: 0.16, solidez: 0.1, aLab: 0.08 };

/**
 * Árvore de decisão. A ordem importa: `toco` é testado antes de `tolete` para
 * resolver a faixa cinzenta entre 14 e 20 cm, onde ambos são plausíveis e o que
 * decide é a espessura.
 */
export function classificarPorArvore(c: Componente): Rotulo {
  if (c.areaCm2 < 1.2 || c.comprimentoCm < 2.5) return 'rejeitado';
  if (c.aglomerado) return 'agregado';

  const verde = c.aMediano <= 20;
  const fino = c.larguraCm <= 2.8;

  if (c.comprimentoCm >= 110 && c.razaoAspecto >= 25) return 'inteira';
  if (c.comprimentoCm >= 30 && c.razaoAspecto >= 14 && (verde || fino)) return 'ponta';
  if (
    c.comprimentoCm >= 7 &&
    c.comprimentoCm < 20 &&
    c.larguraCm >= 2.4 &&
    c.razaoAspecto < 6 &&
    c.solidez >= 0.8
  )
    return 'toco';
  if (c.comprimentoCm >= 14 && c.comprimentoCm < 110 && c.razaoAspecto >= 4.5) return 'tolete';
  if (c.comprimentoCm < 14 || c.solidez < 0.8) return 'lasca';
  return 'tolete';
}

/**
 * Confiança por média geométrica ponderada das pertinências, normalizada entre
 * as classes. Mais tolerante que o mínimo fuzzy estrito, mas ainda penaliza
 * fortemente uma feature incompatível.
 */
export function confiancaFuzzy(c: Componente): Record<ClassePerda, number> {
  const bruto = {} as Record<ClassePerda, number>;
  let soma = 0;

  for (const classe of Object.keys(PERFIS_FUZZY) as ClassePerda[]) {
    const p = PERFIS_FUZZY[classe];
    const mus = {
      comprimento: pertinencia(c.comprimentoCm, p.comprimento),
      razao: pertinencia(c.razaoAspecto, p.razao),
      largura: pertinencia(c.larguraCm, p.largura),
      solidez: pertinencia(c.solidez, p.solidez),
      aLab: pertinencia(c.aMediano, p.aLab),
    };

    let produto = 1;
    for (const k of Object.keys(PESOS) as (keyof typeof PESOS)[]) {
      produto *= Math.pow(Math.max(mus[k], 0.02), PESOS[k]);
    }
    bruto[classe] = produto;
    soma += produto;
  }

  if (soma <= 0) return bruto;
  for (const classe of Object.keys(bruto) as ClassePerda[]) bruto[classe] /= soma;
  return bruto;
}

export interface ParametrosMassa {
  fatorOclusao: number;
  densidades: Record<ClassePerda, number>;
}

export const PARAMETROS_MASSA_PADRAO: ParametrosMassa = {
  fatorOclusao: MODELO_MASSA.fatorOclusao,
  densidades: Object.fromEntries(
    (Object.keys(PERFIS) as ClassePerda[]).map((c) => [c, PERFIS[c].densidadeSuperficial]),
  ) as Record<ClassePerda, number>,
};

/**
 * Massa por densidade superficial sobre a área projetada, corrigida pelo fator
 * de oclusão, que compensa a parte do fragmento coberta por palha ou solo.
 *
 * HIPÓTESE: as densidades são nominais, não vêm de pesagem pareada. Calibrá-las
 * contra a balança é justamente o objeto da Fase 2.
 */
export function estimarMassa(
  c: Componente,
  classe: Rotulo,
  p: ParametrosMassa,
): { massaKg: number; minKg: number; maxKg: number } {
  if (classe === 'rejeitado') return { massaKg: 0, minKg: 0, maxKg: 0 };
  const densidade =
    classe === 'agregado' ? 0.0028 : p.densidades[classe] ?? PERFIS[classe as ClassePerda].densidadeSuperficial;

  const massaKg = densidade * c.areaCm2 * p.fatorOclusao;
  const inc = MODELO_MASSA.incertezaRelativa;
  return { massaKg, minKg: massaKg * (1 - inc), maxKg: massaKg * (1 + inc) };
}

export function classificar(c: Componente, p: ParametrosMassa): Deteccao {
  const rotulo = classificarPorArvore(c);
  const confs = confiancaFuzzy(c);

  let classe: Rotulo = rotulo;
  let confianca = 0;
  let ambiguo = false;

  if (rotulo === 'rejeitado' || rotulo === 'agregado') {
    confianca = rotulo === 'agregado' ? 0.5 : 0;
  } else {
    const melhorFuzzy = (Object.keys(confs) as ClassePerda[]).reduce((a, b) =>
      confs[a] >= confs[b] ? a : b,
    );
    confianca = confs[rotulo];
    if (melhorFuzzy !== rotulo) {
      ambiguo = true;
      confianca = Math.min(confianca, 0.5);
    }
    // Nada aqui se parece com cana: melhor rejeitar do que inventar uma classe.
    if (Math.max(...Object.values(confs)) < 0.15) {
      classe = 'rejeitado';
      confianca = 0;
    }
  }

  const massa = estimarMassa(c, classe, p);
  return {
    ...c,
    classe,
    confianca,
    ambiguo,
    massaKg: massa.massaKg,
    massaMinKg: massa.minKg,
    massaMaxKg: massa.maxKg,
  };
}
