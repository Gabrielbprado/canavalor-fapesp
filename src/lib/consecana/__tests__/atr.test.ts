import { describe, expect, it } from 'vitest';
import { calcularARC, calcularATR, calcularValorTonelada } from '../atr';
import { EXEMPLO_MANUAL, rodarRegressaoManual } from '../regressao';

describe('Motor CONSECANA-SP — exemplo de referência do Manual (5ª ed.)', () => {
  it('reproduz o ATR do exemplo: PC 14,8044 · Pu 87,13 · F 12,53 → 145,99 kg/t', () => {
    const atr = calcularATR(EXEMPLO_MANUAL.entrada);
    expect(atr.valor).toBeCloseTo(145.99, 2);
  });

  it('reproduz o valor da tonelada: 145,99 × R$ 0,3830 → R$ 55,91/t', () => {
    const atr = calcularATR(EXEMPLO_MANUAL.entrada);
    const valor = calcularValorTonelada(atr.valor, 0.383, 0);
    expect(valor.valor).toBeCloseTo(55.91, 2);
  });

  it('aprova o teste de regressão permanente', () => {
    const r = rodarRegressaoManual();
    expect(r.aprovado).toBe(true);
    expect(r.desvioAtr).toBeLessThanOrEqual(0.01);
    expect(r.desvioValor).toBeLessThanOrEqual(0.01);
  });

  it('calcula o ARC intermediário do exemplo', () => {
    const arc = calcularARC(EXEMPLO_MANUAL.entrada);
    expect(arc.valor).toBeCloseTo(0.5474, 4);
  });
});

describe('Trilha de auditoria', () => {
  it('devolve todos os passos do ATR com fórmula e substituição', () => {
    const atr = calcularATR(EXEMPLO_MANUAL.entrada);
    expect(atr.passos).toHaveLength(7);
    expect(atr.ref).toBe('consecana.atr');
    for (const p of atr.passos) {
      expect(p.formula.length).toBeGreaterThan(0);
      expect(p.substituido.length).toBeGreaterThan(0);
      expect(Number.isFinite(p.valor)).toBe(true);
    }
  });

  it('só inclui os passos do fator adicional quando ele é aplicado', () => {
    expect(calcularValorTonelada(145.99, 0.383, 0).passos).toHaveLength(1);
    expect(calcularValorTonelada(145.99, 0.383, 0.045).passos).toHaveLength(3);
  });
});

describe('Fator adicional da revisão 2026', () => {
  it('aplica 4,5% sobre o valor CONSECANA, fora da fórmula', () => {
    const base = calcularValorTonelada(145.99, 0.383, 0).valor;
    const comFator = calcularValorTonelada(145.99, 0.383, 0.045).valor;
    expect(comFator).toBeCloseTo(base * 1.045, 6);
  });
});

describe('Sensibilidade — o motor responde monotonicamente às entradas', () => {
  it('ATR cresce com a pol da cana', () => {
    const baixo = calcularATR({ pc: 12, pureza: 87.13, fibra: 12.53 }).valor;
    const alto = calcularATR({ pc: 16, pureza: 87.13, fibra: 12.53 }).valor;
    expect(alto).toBeGreaterThan(baixo);
  });

  it('ARC cai quando a pureza sobe', () => {
    const baixa = calcularARC({ pc: 14.8, pureza: 80, fibra: 12.53 }).valor;
    const alta = calcularARC({ pc: 14.8, pureza: 92, fibra: 12.53 }).valor;
    expect(alta).toBeLessThan(baixa);
  });
});
