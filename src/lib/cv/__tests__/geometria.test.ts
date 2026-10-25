import { describe, expect, it } from 'vitest';
import { rotularComponentes } from '../componentes';
import {
  areaPoligono,
  comprimentoFibra,
  fechoConvexo,
  perimetroCadeia,
  retanguloMinimo,
  tracarContorno,
} from '../geometria';

function mascara(linhas: string[]) {
  const w = linhas[0].length;
  const h = linhas.length;
  const m = new Uint8Array(w * h);
  linhas.forEach((l, y) => [...l].forEach((c, x) => (m[y * w + x] = c === '#' ? 1 : 0)));
  return { m, w, h };
}

describe('Componentes conexos (8-conectividade)', () => {
  it('separa dois blocos distantes', () => {
    const { m, w, h } = mascara(['##..##', '##..##', '......']);
    const r = rotularComponentes(m, w, h);
    expect(r.quantidade).toBe(2);
    expect(r.areas[1]).toBe(4);
    expect(r.areas[2]).toBe(4);
  });

  it('une pixels tocando na diagonal — é o que 8-conectividade significa', () => {
    const { m, w, h } = mascara(['#..', '.#.', '..#']);
    expect(rotularComponentes(m, w, h).quantidade).toBe(1);
  });

  it('resolve o caso em U, onde as duas pernas só se encontram no fim', () => {
    const { m, w, h } = mascara(['#...#', '#...#', '#...#', '#####']);
    const r = rotularComponentes(m, w, h);
    expect(r.quantidade).toBe(1);
    expect(r.areas[1]).toBe(11);
  });

  it('registra a bbox correta', () => {
    const { m, w, h } = mascara(['.....', '.###.', '.###.', '.....']);
    const r = rotularComponentes(m, w, h);
    expect([...r.bboxes.slice(4, 8)]).toEqual([1, 1, 3, 2]);
  });

  it('máscara vazia não produz componentes', () => {
    const { m, w, h } = mascara(['...', '...']);
    expect(rotularComponentes(m, w, h).quantidade).toBe(0);
  });
});

describe('Contorno e perímetro', () => {
  it('percorre o contorno de um quadrado 4×4 sem entrar no interior', () => {
    const { m, w, h } = mascara(['......', '.####.', '.####.', '.####.', '.####.', '......']);
    const r = rotularComponentes(m, w, h);
    const c = tracarContorno(r.rotulos, w, h, 1, 1, 1);
    const pts = new Set<string>();
    for (let i = 0; i < c.length; i += 2) pts.add(`${c[i]},${c[i + 1]}`);
    expect(pts.size).toBe(12); // borda do 4×4: 16 − 4 internos
    expect(pts.has('2,2')).toBe(false);
  });

  it('perímetro do quadrado 4×4 fica próximo de 12 passos ortogonais', () => {
    const { m, w, h } = mascara(['......', '.####.', '.####.', '.####.', '.####.', '......']);
    const r = rotularComponentes(m, w, h);
    const p = perimetroCadeia(tracarContorno(r.rotulos, w, h, 1, 1, 1));
    expect(p).toBeGreaterThan(10);
    expect(p).toBeLessThan(16);
  });
});

describe('Fecho convexo e retângulo mínimo', () => {
  it('o fecho de um quadrado tem 4 vértices e a área do quadrado', () => {
    const pontos = Int32Array.from([0, 0, 10, 0, 10, 10, 0, 10, 5, 5, 3, 7]);
    const casco = fechoConvexo(pontos);
    expect(casco.length / 2).toBe(4);
    expect(areaPoligono(casco)).toBeCloseTo(100, 6);
  });

  it('o retângulo mínimo de um quadrado alinhado tem os lados do quadrado', () => {
    const casco = fechoConvexo(Int32Array.from([0, 0, 20, 0, 20, 8, 0, 8]));
    const obb = retanguloMinimo(casco);
    expect(obb.w).toBeCloseTo(20, 4);
    expect(obb.h).toBeCloseTo(8, 4);
    expect(obb.cx).toBeCloseTo(10, 4);
    expect(obb.cy).toBeCloseTo(4, 4);
  });

  it('encontra a orientação de um retângulo girado a 45°', () => {
    // losango: retângulo 20×20 girado 45° tem fecho em forma de diamante
    const casco = fechoConvexo(Int32Array.from([50, 0, 100, 50, 50, 100, 0, 50]));
    const obb = retanguloMinimo(casco);
    const graus = Math.abs((obb.angulo * 180) / Math.PI) % 90;
    expect(Math.min(graus, 90 - graus)).toBeCloseTo(45, 0);
  });
});

describe('Modelo de fibra', () => {
  it('recupera L e W de um retângulo conhecido a partir de área e perímetro', () => {
    const L = 200;
    const W = 3;
    const r = comprimentoFibra(L * W, 2 * (L + W));
    expect(r?.comprimento).toBeCloseTo(L, 4);
    expect(r?.largura).toBeCloseTo(W, 4);
  });

  it('devolve nulo quando a forma não admite solução (círculo)', () => {
    const raio = 10;
    expect(comprimentoFibra(Math.PI * raio * raio, 2 * Math.PI * raio)).toBeNull();
  });
});
