/**
 * Teste de regressão do exemplo de referência do Manual CONSECANA-SP.
 *
 * O projeto CanaValor define este exemplo como "teste unitário permanente do
 * sistema". Ele roda também na interface, à vista da banca: enquanto estiver
 * verde, o motor reproduz a norma.
 */

import { calcularATR, calcularValorTonelada, type ParametrosLaboratorio } from './atr';

export const EXEMPLO_MANUAL = {
  entrada: { pc: 14.8044, pureza: 87.13, fibra: 12.53 } satisfies ParametrosLaboratorio,
  precoKgAtr: 0.383,
  atrEsperado: 145.99,
  valorEsperado: 55.91,
  /** O Manual enuncia "aproximadamente"; a tolerância cobre o arredondamento publicado. */
  toleranciaAtr: 0.01,
  toleranciaValor: 0.01,
} as const;

export interface ResultadoRegressao {
  aprovado: boolean;
  atrObtido: number;
  atrEsperado: number;
  desvioAtr: number;
  valorObtido: number;
  valorEsperado: number;
  desvioValor: number;
}

export function rodarRegressaoManual(): ResultadoRegressao {
  const atr = calcularATR(EXEMPLO_MANUAL.entrada);
  const valor = calcularValorTonelada(atr.valor, EXEMPLO_MANUAL.precoKgAtr, 0);

  const desvioAtr = Math.abs(atr.valor - EXEMPLO_MANUAL.atrEsperado);
  const desvioValor = Math.abs(valor.valor - EXEMPLO_MANUAL.valorEsperado);

  return {
    aprovado:
      desvioAtr <= EXEMPLO_MANUAL.toleranciaAtr &&
      desvioValor <= EXEMPLO_MANUAL.toleranciaValor,
    atrObtido: atr.valor,
    atrEsperado: EXEMPLO_MANUAL.atrEsperado,
    desvioAtr,
    valorObtido: valor.valor,
    valorEsperado: EXEMPLO_MANUAL.valorEsperado,
    desvioValor,
  };
}
