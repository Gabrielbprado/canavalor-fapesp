import { describe, expect, it } from 'vitest';
import { CLASSES } from '../../dominio';
import { TALHOES, severidadeDoTalhao } from '../talhoes';

describe('Talhões sintéticos', () => {
  it('gera 12 talhões com identificadores genéricos', () => {
    expect(TALHOES).toHaveLength(12);
    expect(TALHOES.map((t) => t.id)).toEqual(
      Array.from({ length: 12 }, (_, i) => `T-${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('a perda por classe soma exatamente a perda total', () => {
    for (const t of TALHOES) {
      const soma = CLASSES.reduce((s, c) => s + t.perdaPorClasseKgHa[c], 0);
      expect(soma).toBeCloseTo(t.perdaTotalKgHa, 6);
    }
  });

  it('a perda total corresponde ao percentual declarado da produtividade', () => {
    for (const t of TALHOES) {
      const pct = (t.perdaTotalKgHa / (t.produtividadeTHa * 1000)) * 100;
      expect(pct).toBeCloseTo(t.percentualPerda, 4);
    }
  });

  it('cobre as três faixas de severidade da escala CTC', () => {
    const faixas = new Set(TALHOES.map((t) => severidadeDoTalhao(t).id));
    expect(faixas).toEqual(new Set(['baixo', 'medio', 'alto']));
  });

  it('os polígonos são quadriláteros dentro do quadro do mapa', () => {
    for (const t of TALHOES) {
      expect(t.poligono).toHaveLength(4);
      for (const [x, y] of t.poligono) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('é determinístico: a semente fixa reproduz sempre o mesmo conjunto', () => {
    // Os percentuais são uma permutação fixa da lista de projeto; se a geração
    // deixar de ser determinística, a demonstração muda a cada recarga.
    expect([...TALHOES.map((t) => t.percentualPerda)].sort((a, b) => a - b)).toEqual([
      1.4, 2.2, 2.8, 3.1, 3.6, 4.1, 4.4, 4.9, 5.3, 5.8, 6.4, 7.2,
    ]);
    // Âncoras da permutação: mudam se a semente ou a ordem de sorteio mudarem
    const primeiro = TALHOES[0];
    expect(primeiro.percentualPerda).toBe(1.4);
    expect(primeiro.produtividadeTHa).toBeGreaterThan(60);
  });
});
