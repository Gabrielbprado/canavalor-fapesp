import { describe, expect, it } from 'vitest';
import { amostrarTriangular, mediaTriangular, percentil } from '../distribuicoes';
import { mediaTeorica, simular, type EntradaSimulacao } from '../montecarlo';
import { mulberry32 } from '../prng';

const base: EntradaSimulacao = {
  atrPerdidoKgHa: 420,
  precoKgAtr: { min: 0.85, moda: 0.9705, max: 1.15 },
  mixAcucar: { min: 0.44, moda: 0.51, max: 0.58 },
  premioAcucar: 1.0,
  fatorAdicional: 0,
  fracaoAdiantada: 0.7,
  precoAdiantamento: 0.9,
  iteracoes: 10_000,
  semente: 20260901,
};

describe('Gerador pseudoaleatório', () => {
  it('é determinístico para a mesma semente', () => {
    const a = Array.from({ length: 50 }, mulberry32(7));
    const b = Array.from({ length: 50 }, mulberry32(7));
    expect(a).toEqual(b);
  });

  it('produz sequências distintas para sementes distintas', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('fica dentro de [0, 1)', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 5000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('Distribuição triangular', () => {
  it('respeita os limites', () => {
    const t = { min: 2, moda: 5, max: 9 };
    for (let i = 0; i <= 100; i++) {
      const v = amostrarTriangular(t, i / 100);
      expect(v).toBeGreaterThanOrEqual(t.min - 1e-9);
      expect(v).toBeLessThanOrEqual(t.max + 1e-9);
    }
  });

  it('converge para a média teórica (min+moda+max)/3', () => {
    const t = { min: 2, moda: 5, max: 9 };
    const r = mulberry32(42);
    let soma = 0;
    const n = 200_000;
    for (let i = 0; i < n; i++) soma += amostrarTriangular(t, r());
    expect(soma / n).toBeCloseTo(mediaTriangular(t), 1);
  });

  it('degenera corretamente quando min = max', () => {
    expect(amostrarTriangular({ min: 3, moda: 3, max: 3 }, 0.7)).toBe(3);
  });
});

describe('Percentis', () => {
  it('interpola sobre a amostra ordenada', () => {
    const a = Float64Array.from([0, 10, 20, 30, 40]);
    expect(percentil(a, 0)).toBe(0);
    expect(percentil(a, 0.5)).toBe(20);
    expect(percentil(a, 1)).toBe(40);
    expect(percentil(a, 0.25)).toBeCloseTo(10, 6);
  });
});

describe('Simulação Monte Carlo', () => {
  it('é reproduzível: a mesma semente devolve os mesmos percentis', () => {
    const a = simular(base);
    const b = simular(base);
    expect([a.p5, a.p50, a.p95]).toEqual([b.p5, b.p50, b.p95]);
  });

  it('sementes diferentes mudam o resultado, mas pouco', () => {
    const a = simular(base);
    const b = simular({ ...base, semente: 777 });
    expect(a.p50).not.toBe(b.p50);
    expect(Math.abs(a.media - b.media) / a.media).toBeLessThan(0.01);
  });

  it('a média converge para a teórica dentro de 1%', () => {
    const r = simular(base);
    const teorica = mediaTeorica(base);
    expect(Math.abs(r.media - teorica) / teorica).toBeLessThan(0.01);
  });

  it('os percentis vêm ordenados e cercam a mediana', () => {
    const r = simular(base);
    expect(r.p5).toBeLessThan(r.p25);
    expect(r.p25).toBeLessThan(r.p50);
    expect(r.p50).toBeLessThan(r.p75);
    expect(r.p75).toBeLessThan(r.p95);
  });

  it('entrega um intervalo, não um ponto: P95 supera P5 de forma material', () => {
    const r = simular(base);
    expect((r.p95 - r.p5) / r.p50).toBeGreaterThan(0.1);
  });

  it('o fator adicional de 4,5% desloca toda a distribuição', () => {
    const sem = simular(base);
    const com = simular({ ...base, fatorAdicional: 0.045 });
    expect(com.p50 / sem.p50).toBeCloseTo(1.045, 3);
    expect(com.p5 / sem.p5).toBeCloseTo(1.045, 3);
  });

  it('decompõe o valor entre adiantamentos e acerto de safra', () => {
    const r = simular(base);
    expect(r.adiantadoMedio).toBeCloseTo(420 * 0.9 * 0.7, 6);
    expect(r.adiantadoMedio + r.acertoMedio).toBeCloseTo(r.media, 6);
  });

  it('o histograma cobre toda a amostra', () => {
    const r = simular(base);
    const total = r.histograma.reduce((s, f) => s + f.contagem, 0);
    expect(total).toBe(base.iteracoes);
  });

  it('a curva de convergência estabiliza no valor final', () => {
    const r = simular(base);
    const ultima = r.convergencia[r.convergencia.length - 1];
    expect(ultima.media).toBeCloseTo(r.media, 6);
  });

  it('o prêmio do açúcar move o resultado na direção esperada', () => {
    const neutro = simular(base);
    const premio = simular({ ...base, premioAcucar: 1.2 });
    expect(premio.p50).toBeGreaterThan(neutro.p50);
  });
});
