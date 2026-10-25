/**
 * Motor de cálculo do CONSECANA-SP.
 *
 * Reproduz as fórmulas oficiais do Manual de Instruções (5ª edição), conforme
 * transcritas no projeto CanaValor:
 *
 *   ARC = (3,641 − 0,0343 × Pu) × (1 − 0,01 × F) × (1,0313 − 0,00575 × F)
 *   ATR = 9,5263 × PC + 9,05 × ARC
 *
 * Os coeficientes já incorporam o fator de 9,5% de perdas industriais previsto
 * na metodologia.
 */

import { type Calculo, num } from '../auditoria/trilha';

/** Coeficientes da 5ª edição do Manual. Não são constantes de conveniência: são norma. */
export const COEF = {
  ATR_PC: 9.5263,
  ATR_ARC: 9.05,
  ARC_A: 3.641,
  ARC_B: 0.0343,
  ARC_C: 0.01,
  ARC_D: 1.0313,
  ARC_E: 0.00575,
} as const;

export interface ParametrosLaboratorio {
  /** PC — pol da cana (%) */
  pc: number;
  /** Pu — pureza do caldo (%) */
  pureza: number;
  /** F — teor de fibra (%) */
  fibra: number;
}

/** Açúcares Redutores da Cana. */
export function calcularARC(p: ParametrosLaboratorio): Calculo {
  const { pureza: pu, fibra: f } = p;

  const t1 = COEF.ARC_A - COEF.ARC_B * pu;
  const t2 = 1 - COEF.ARC_C * f;
  const t3 = COEF.ARC_D - COEF.ARC_E * f;
  const arc = t1 * t2 * t3;

  return {
    valor: arc,
    unidade: '%',
    ref: 'consecana.arc',
    passos: [
      {
        rotulo: 'Termo da pureza',
        formula: '3,641 − 0,0343 × Pu',
        substituido: `3,641 − 0,0343 × ${num(pu, 2)}`,
        valor: t1,
        unidade: '',
        ref: 'consecana.arc',
      },
      {
        rotulo: 'Termo da fibra (1)',
        formula: '1 − 0,01 × F',
        substituido: `1 − 0,01 × ${num(f, 2)}`,
        valor: t2,
        unidade: '',
        ref: 'consecana.arc',
      },
      {
        rotulo: 'Termo da fibra (2)',
        formula: '1,0313 − 0,00575 × F',
        substituido: `1,0313 − 0,00575 × ${num(f, 2)}`,
        valor: t3,
        unidade: '',
        ref: 'consecana.arc',
      },
      {
        rotulo: 'ARC',
        formula: '(3,641 − 0,0343 × Pu) × (1 − 0,01 × F) × (1,0313 − 0,00575 × F)',
        substituido: `${num(t1)} × ${num(t2)} × ${num(t3)}`,
        valor: arc,
        unidade: '%',
        ref: 'consecana.arc',
      },
    ],
  };
}

/** Açúcar Total Recuperável, em kg por tonelada de cana. */
export function calcularATR(p: ParametrosLaboratorio): Calculo {
  const arc = calcularARC(p);

  const parcelaPC = COEF.ATR_PC * p.pc;
  const parcelaARC = COEF.ATR_ARC * arc.valor;
  const atr = parcelaPC + parcelaARC;

  return {
    valor: atr,
    unidade: 'kg ATR/t',
    ref: 'consecana.atr',
    passos: [
      ...arc.passos,
      {
        rotulo: 'Parcela da pol',
        formula: '9,5263 × PC',
        substituido: `9,5263 × ${num(p.pc, 4)}`,
        valor: parcelaPC,
        unidade: 'kg/t',
        ref: 'consecana.atr',
      },
      {
        rotulo: 'Parcela dos redutores',
        formula: '9,05 × ARC',
        substituido: `9,05 × ${num(arc.valor)}`,
        valor: parcelaARC,
        unidade: 'kg/t',
        ref: 'consecana.atr',
      },
      {
        rotulo: 'ATR',
        formula: '9,5263 × PC + 9,05 × ARC',
        substituido: `${num(parcelaPC)} + ${num(parcelaARC)}`,
        valor: atr,
        unidade: 'kg ATR/t',
        ref: 'consecana.atr',
      },
    ],
  };
}

/**
 * Valor da tonelada de cana entregue.
 *
 * `fatorAdicional` corresponde ao componente que fica FORA da fórmula de
 * referência — hoje, o fator garantido de 4,5% ao produtor criado pela revisão
 * de 16/04/2026. Passe 0 para operar estritamente na 5ª edição.
 */
export function calcularValorTonelada(
  atrKgPorT: number,
  precoKgAtr: number,
  fatorAdicional = 0,
): Calculo {
  const base = atrKgPorT * precoKgAtr;
  const adicional = base * fatorAdicional;
  const total = base + adicional;

  const passos: Calculo['passos'] = [
    {
      rotulo: 'Valor CONSECANA',
      formula: 'ATR × preço do kg de ATR',
      substituido: `${num(atrKgPorT, 2)} × ${num(precoKgAtr, 4)}`,
      valor: base,
      unidade: 'R$/t',
      ref: 'consecana.valor-tonelada',
    },
  ];

  if (fatorAdicional !== 0) {
    passos.push(
      {
        rotulo: 'Fator adicional ao produtor',
        formula: 'Valor CONSECANA × fator adicional',
        substituido: `${num(base, 2)} × ${num(fatorAdicional, 3)}`,
        valor: adicional,
        unidade: 'R$/t',
        ref: 'consecana.revisao-2026',
      },
      {
        rotulo: 'Valor final',
        formula: 'Valor CONSECANA + fator adicional',
        substituido: `${num(base, 2)} + ${num(adicional, 2)}`,
        valor: total,
        unidade: 'R$/t',
        ref: 'consecana.revisao-2026',
      },
    );
  }

  return {
    valor: total,
    unidade: 'R$/t',
    ref: fatorAdicional !== 0 ? 'consecana.revisao-2026' : 'consecana.valor-tonelada',
    passos,
  };
}
