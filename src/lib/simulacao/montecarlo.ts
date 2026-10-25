/**
 * Simulação probabilística da remuneração sob incerteza de preço e mix.
 *
 * O fornecedor entrega a cana e recebe adiantamentos ao longo da safra; o valor
 * definitivo só fecha no acerto anual, conforme o mix realizado e o preço
 * acumulado do kg de ATR. Esse descasamento entre entrega e pagamento é o que
 * torna a projeção um intervalo, e não um número.
 *
 * A saída nunca é pontual: são percentis. Um valor único esconderia justamente
 * a incerteza que o módulo existe para representar.
 */

import { type Triangular, amostrarTriangular, mediaTriangular, percentil } from './distribuicoes';
import { mulberry32 } from './prng';

export interface EntradaSimulacao {
  /** ATR perdido no talhão, em kg por hectare. */
  atrPerdidoKgHa: number;
  precoKgAtr: Triangular;
  /** Participação do açúcar no mix, entre 0 e 1. */
  mixAcucar: Triangular;
  /**
   * Prêmio do açúcar sobre o etanol. Multiplica a parcela do mix destinada ao
   * açúcar; 1,0 significa indiferença entre os dois destinos.
   */
  premioAcucar: number;
  /** Componente fora da fórmula (0,045 na revisão de 2026). */
  fatorAdicional: number;
  /** Fração do valor paga como adiantamento ao longo da safra. */
  fracaoAdiantada: number;
  /** Preço do kg de ATR usado como base dos adiantamentos. */
  precoAdiantamento: number;
  iteracoes: number;
  semente: number;
}

export interface ResultadoSimulacao {
  /** Perda de remuneração em R$/ha, por percentil. */
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
  media: number;
  desvio: number;
  /** Histograma para exibição: contagens por faixa. */
  histograma: { inicio: number; fim: number; contagem: number }[];
  /** Convergência da média ao longo das iterações. */
  convergencia: { iteracao: number; media: number }[];
  /** Já adiantado × ainda a acertar, em R$/ha. */
  adiantadoMedio: number;
  acertoMedio: number;
  iteracoes: number;
  semente: number;
}

function valorPorIteracao(e: EntradaSimulacao, preco: number, mix: number): number {
  // O mix desloca o valor recebido por kg de ATR: a parcela destinada ao açúcar
  // é remunerada com o prêmio, a destinada ao etanol sem ele.
  const fatorMix = mix * e.premioAcucar + (1 - mix);
  return e.atrPerdidoKgHa * preco * fatorMix * (1 + e.fatorAdicional);
}

export function simular(e: EntradaSimulacao): ResultadoSimulacao {
  const n = Math.max(1, e.iteracoes);
  const aleatorio = mulberry32(e.semente);
  const amostras = new Float64Array(n);

  const passoConvergencia = Math.max(1, Math.floor(n / 60));
  const convergencia: ResultadoSimulacao['convergencia'] = [];

  let soma = 0;
  for (let i = 0; i < n; i++) {
    const preco = amostrarTriangular(e.precoKgAtr, aleatorio());
    const mix = amostrarTriangular(e.mixAcucar, aleatorio());
    const v = valorPorIteracao(e, preco, mix);
    amostras[i] = v;
    soma += v;
    // Registra também a última iteração, mesmo que não caia no passo: sem isso
    // a curva termina antes do valor que o painel exibe como resultado.
    if ((i + 1) % passoConvergencia === 0 || i === n - 1) {
      const anterior = convergencia[convergencia.length - 1];
      if (anterior?.iteracao === i + 1) anterior.media = soma / (i + 1);
      else convergencia.push({ iteracao: i + 1, media: soma / (i + 1) });
    }
  }

  const media = soma / n;
  let somaQuad = 0;
  for (let i = 0; i < n; i++) somaQuad += (amostras[i] - media) ** 2;
  const desvio = n > 1 ? Math.sqrt(somaQuad / (n - 1)) : 0;

  const ordenada = Float64Array.from(amostras).sort();

  // Adiantamentos: pagos ao preço corrente da safra, sem o mix realizado nem o
  // fator adicional, que só entram no acerto.
  const adiantadoMedio =
    e.atrPerdidoKgHa * e.precoAdiantamento * e.fracaoAdiantada;

  return {
    p5: percentil(ordenada, 0.05),
    p25: percentil(ordenada, 0.25),
    p50: percentil(ordenada, 0.5),
    p75: percentil(ordenada, 0.75),
    p95: percentil(ordenada, 0.95),
    media,
    desvio,
    histograma: construirHistograma(ordenada, 32),
    convergencia,
    adiantadoMedio,
    acertoMedio: media - adiantadoMedio,
    iteracoes: n,
    semente: e.semente,
  };
}

function construirHistograma(
  ordenada: Float64Array,
  faixas: number,
): ResultadoSimulacao['histograma'] {
  const min = ordenada[0];
  const max = ordenada[ordenada.length - 1];
  const largura = (max - min) / faixas || 1;

  const contagens = new Uint32Array(faixas);
  for (const v of ordenada) {
    const k = Math.min(faixas - 1, Math.floor((v - min) / largura));
    contagens[k]++;
  }

  return Array.from({ length: faixas }, (_, k) => ({
    inicio: min + k * largura,
    fim: min + (k + 1) * largura,
    contagem: contagens[k],
  }));
}

/** Média teórica, usada para verificar a convergência da simulação. */
export function mediaTeorica(e: EntradaSimulacao): number {
  const mix = mediaTriangular(e.mixAcucar);
  return valorPorIteracao(e, mediaTriangular(e.precoKgAtr), mix);
}

/** Cenários de preço nomeados, com a fonte de cada um. */
export const CENARIOS_PRECO: Record<string, { rotulo: string; dist: Triangular; ref: string }> = {
  '2026-27': {
    rotulo: 'Safra 2026/27 (projetado)',
    dist: { min: 0.85, moda: 0.9705, max: 1.15 },
    ref: 'mercado.preco-atr',
  },
  '2025-26': {
    rotulo: 'Safra 2025/26',
    dist: { min: 1.02, moda: 1.12, max: 1.24 },
    ref: 'mercado.preco-atr',
  },
  manual: {
    rotulo: 'Exemplo do Manual (5ª ed.)',
    dist: { min: 0.383, moda: 0.383, max: 0.383 },
    ref: 'consecana.exemplo-referencia',
  },
};
