import { describe, expect, it } from 'vitest';
import { calcularPerdas, perdaEquivalente, trilhaClasse } from '../perdas';
import { CLASSES, type ClassePerda, MERCADO } from '../../dominio';

const zeros = (): Record<ClassePerda, number> =>
  Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<ClassePerda, number>;

const base = {
  atrTalhaoKgT: 137.79,
  produtividadeTHa: 74.4,
  precoKgAtr: 0.9705,
  fatorAdicional: 0,
  incluirInvisivel: false,
};

describe('Elo perda → ATR → remuneração', () => {
  it('converte 1 t/ha de cana inteira perdida no ATR do talhão', () => {
    const r = calcularPerdas({ ...base, perdaPorClasseKgHa: { ...zeros(), inteira: 1000 } });
    // fator de ATR da cana inteira = 1,00 → ATR perdido = ATR do talhão
    expect(r.atrPerdidoKgHa).toBeCloseTo(137.79, 2);
    expect(r.reaisPorHaVisivel).toBeCloseTo(137.79 * 0.9705, 2);
  });

  it('penaliza a ponta pelo baixo teor de sacarose', () => {
    const inteira = calcularPerdas({
      ...base,
      perdaPorClasseKgHa: { ...zeros(), inteira: 1000 },
    });
    const ponta = calcularPerdas({ ...base, perdaPorClasseKgHa: { ...zeros(), ponta: 1000 } });
    // mesma massa, metade do ATR: o fator da ponta é 0,50
    expect(ponta.atrPerdidoKgHa).toBeCloseTo(inteira.atrPerdidoKgHa * 0.5, 4);
  });

  it('classifica a severidade pela escala CTC sobre a perda VISÍVEL', () => {
    const kgHaPara = (pct: number) => (74.4 * 1000 * pct) / 100;
    expect(
      calcularPerdas({ ...base, perdaPorClasseKgHa: { ...zeros(), tolete: kgHaPara(1.5) } })
        .severidade.id,
    ).toBe('baixo');
    expect(
      calcularPerdas({ ...base, perdaPorClasseKgHa: { ...zeros(), tolete: kgHaPara(3.5) } })
        .severidade.id,
    ).toBe('medio');
    expect(
      calcularPerdas({ ...base, perdaPorClasseKgHa: { ...zeros(), tolete: kgHaPara(6) } })
        .severidade.id,
    ).toBe('alto');
  });
});

describe('Perda invisível', () => {
  const entrada = { ...base, perdaPorClasseKgHa: { ...zeros(), tolete: 2000 } };

  it('fica fora dos totais quando não é solicitada', () => {
    const r = calcularPerdas(entrada);
    expect(r.perdaInvisivelKgHa).toBe(0);
    expect(r.linhas.some((l) => l.estimada)).toBe(false);
    expect(r.reaisPorHaTotal).toBeCloseTo(r.reaisPorHaVisivel, 6);
  });

  it('entra como linha própria, marcada como estimada, sem contaminar o visível', () => {
    const r = calcularPerdas({ ...entrada, incluirInvisivel: true, razaoInvisivel: 1 });
    const linha = r.linhas.find((l) => l.classe === 'invisivel');
    expect(linha?.estimada).toBe(true);
    expect(r.perdaVisivelKgHa).toBe(2000);
    expect(r.perdaInvisivelKgHa).toBe(2000);
    expect(r.reaisPorHaTotal).toBeGreaterThan(r.reaisPorHaVisivel);
  });

  it('não altera a severidade CTC, que se mede sobre o visível', () => {
    const sem = calcularPerdas(entrada).severidade.id;
    const com = calcularPerdas({ ...entrada, incluirInvisivel: true }).severidade.id;
    expect(com).toBe(sem);
  });
});

describe('Fator adicional da revisão 2026', () => {
  it('aumenta a remuneração perdida em 4,5%', () => {
    const entrada = { ...base, perdaPorClasseKgHa: { ...zeros(), inteira: 1500 } };
    const sem = calcularPerdas(entrada).reaisPorHaTotal;
    const com = calcularPerdas({ ...entrada, fatorAdicional: 0.045 }).reaisPorHaTotal;
    expect(com).toBeCloseTo(sem * 1.045, 6);
  });
});

describe('Trilha e equivalências', () => {
  it('a trilha da classe termina no mesmo R$/ha do cálculo agregado', () => {
    const r = calcularPerdas({ ...base, perdaPorClasseKgHa: { ...zeros(), toco: 800 } });
    const t = trilhaClasse('toco', 800, 137.79, 0.9, 0.9705, 0);
    expect(t.valor).toBeCloseTo(r.reaisPorHaVisivel, 6);
    expect(t.passos).toHaveLength(3);
  });

  it('perdaEquivalente traduz % de produtividade em R$/ha', () => {
    const cinco = perdaEquivalente(5);
    expect(cinco).toBeCloseTo(74.4 * 0.05 * MERCADO.atrMedioKgT * MERCADO.precoAtrProjetado, 4);
    expect(perdaEquivalente(10)).toBeCloseTo(cinco * 2, 6);
  });
});
