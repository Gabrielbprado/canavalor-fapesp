import { describe, expect, it } from 'vitest';
import { abrir, criarRascunho, dilatar, erodir, fechar, preencherBuracos } from '../morfologia';

/** Constrói uma máscara a partir de um desenho ASCII: '#' ligado, '.' desligado. */
function mascara(linhas: string[]): { m: Uint8Array; w: number; h: number } {
  const w = linhas[0].length;
  const h = linhas.length;
  const m = new Uint8Array(w * h);
  linhas.forEach((l, y) => [...l].forEach((c, x) => (m[y * w + x] = c === '#' ? 1 : 0)));
  return { m, w, h };
}

const desenhar = (m: Uint8Array, w: number, h: number) =>
  Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (m[y * w + x] ? '#' : '.')).join(''),
  );

describe('Dilatação e erosão (van Herk, elemento retangular)', () => {
  it('dilata um pixel isolado num quadrado 3×3', () => {
    const { m, w, h } = mascara(['.....', '.....', '..#..', '.....', '.....']);
    const out = new Uint8Array(m.length);
    dilatar(m, out, w, h, 1, criarRascunho(w, h));
    expect(desenhar(out, w, h)).toEqual(['.....', '.###.', '.###.', '.###.', '.....']);
  });

  it('dilata com raio 2 num quadrado 5×5', () => {
    const { m, w, h } = mascara(['.......', '.......', '.......', '...#...', '.......', '.......', '.......']);
    const out = new Uint8Array(m.length);
    dilatar(m, out, w, h, 2, criarRascunho(w, h));
    const soma = out.reduce((a, b) => a + b, 0);
    expect(soma).toBe(25);
  });

  it('erode um quadrado 3×3 até um único pixel', () => {
    const { m, w, h } = mascara(['.....', '.###.', '.###.', '.###.', '.....']);
    const out = new Uint8Array(m.length);
    erodir(m, out, w, h, 1, criarRascunho(w, h));
    expect(desenhar(out, w, h)).toEqual(['.....', '.....', '..#..', '.....', '.....']);
  });

  it('a erosão não come a imagem pela borda (padding com ligado)', () => {
    const { m, w, h } = mascara(['###', '###', '###']);
    const out = new Uint8Array(m.length);
    erodir(m, out, w, h, 1, criarRascunho(w, h));
    expect(desenhar(out, w, h)).toEqual(['###', '###', '###']);
  });

  it('raio 0 é identidade', () => {
    const { m, w, h } = mascara(['#.#', '.#.', '#.#']);
    const out = new Uint8Array(m.length);
    dilatar(m, out, w, h, 0, criarRascunho(w, h));
    expect([...out]).toEqual([...m]);
  });
});

describe('Abertura e fechamento', () => {
  it('a abertura remove salpico isolado e preserva o bloco maior', () => {
    const { m, w, h } = mascara([
      '.........',
      '.###.....',
      '.###.....',
      '.###...#.',
      '.........',
    ]);
    const out = new Uint8Array(m.length);
    abrir(m, out, w, h, 1, criarRascunho(w, h));
    expect(out[3 * w + 7]).toBe(0); // o salpico sumiu
    expect(out[2 * w + 2]).toBe(1); // o bloco continua
  });

  it('o fechamento costura uma falha estreita entre dois blocos', () => {
    const { m, w, h } = mascara([
      '.........',
      '.##.##...',
      '.##.##...',
      '.##.##...',
      '.........',
    ]);
    const out = new Uint8Array(m.length);
    fechar(m, out, w, h, 1, criarRascunho(w, h));
    expect(out[2 * w + 3]).toBe(1); // a coluna vazia foi costurada
  });
});

describe('Preenchimento de buracos', () => {
  it('fecha um buraco interno sem tocar o fundo externo', () => {
    const { m, w, h } = mascara([
      '.....',
      '.###.',
      '.#.#.',
      '.###.',
      '.....',
    ]);
    const out = new Uint8Array(m.length);
    preencherBuracos(m, out, w, h, criarRascunho(w, h));
    expect(desenhar(out, w, h)).toEqual(['.....', '.###.', '.###.', '.###.', '.....']);
  });

  it('não preenche uma cavidade aberta para a borda', () => {
    const { m, w, h } = mascara([
      '.###.',
      '.#.#.',
      '.#.#.',
      '.#.#.',
      '.....',
    ]);
    const out = new Uint8Array(m.length);
    preencherBuracos(m, out, w, h, criarRascunho(w, h));
    expect(out[2 * w + 2]).toBe(0);
  });
});
