/**
 * Morfologia binária com elemento estruturante retangular.
 *
 * O retângulo é separável sob mín/máx, então erosão e dilatação 2-D viram uma
 * passada horizontal seguida de uma vertical. Cada passada usa van Herk–
 * Gil-Werman: duas comparações por pixel, custo independente do raio. É o que
 * mantém os sliders em tempo real mesmo com kernel grande.
 */

/** Raio máximo aceito pelos operadores; dimensiona os buffers de linha. */
export const RAIO_MAX = 16;

export interface Rascunho {
  tmp: Uint8Array;
  meio: Uint8Array;
  g: Uint8Array;
  h: Uint8Array;
  fila: Int32Array;
}

export function criarRascunho(largura: number, altura: number): Rascunho {
  const n = largura * altura;
  const linha = Math.max(largura, altura) + 2 * RAIO_MAX + 2;
  return {
    tmp: new Uint8Array(n),
    meio: new Uint8Array(n),
    g: new Uint8Array(linha),
    h: new Uint8Array(linha),
    fila: new Int32Array(n),
  };
}

/**
 * van Herk–Gil-Werman em uma linha, com passo arbitrário (para reusar o mesmo
 * código nas varreduras horizontal e vertical).
 */
function vhgw1d(
  src: Uint8Array,
  dst: Uint8Array,
  inicio: number,
  passo: number,
  comprimento: number,
  raio: number,
  maximo: boolean,
  g: Uint8Array,
  h: Uint8Array,
): void {
  const k = 2 * raio + 1;
  const borda = maximo ? 0 : 1;
  const melhor = maximo
    ? (a: number, b: number) => (a > b ? a : b)
    : (a: number, b: number) => (a < b ? a : b);

  // Copia a linha para um buffer com padding de `raio` de cada lado
  const total = comprimento + 2 * raio;
  for (let i = 0; i < total; i++) {
    const idx = i - raio;
    g[i] = idx < 0 || idx >= comprimento ? borda : src[inicio + idx * passo];
  }

  // Prefixo por bloco de tamanho k: h[j] = melhor(padded[s..j])
  for (let s = 0; s < total; s += k) {
    const fim = Math.min(s + k, total);
    h[s] = g[s];
    for (let j = s + 1; j < fim; j++) h[j] = melhor(h[j - 1], g[j]);
  }

  // Sufixo por bloco, escrito de volta em g: g[j] = melhor(padded[j..fim-1])
  for (let s = 0; s < total; s += k) {
    const fim = Math.min(s + k, total);
    for (let j = fim - 2; j >= s; j--) g[j] = melhor(g[j + 1], g[j]);
  }

  // A janela [i, i+k-1] cruza no máximo uma fronteira de bloco, então o
  // resultado é a combinação do sufixo na abertura com o prefixo no fecho.
  for (let i = 0; i < comprimento; i++) {
    dst[inicio + i * passo] = melhor(g[i], h[i + 2 * raio]);
  }
}

function aplicar(
  src: Uint8Array,
  dst: Uint8Array,
  largura: number,
  altura: number,
  raio: number,
  maximo: boolean,
  sc: Rascunho,
): void {
  if (raio <= 0) {
    dst.set(src);
    return;
  }
  raio = Math.min(raio, RAIO_MAX);
  for (let y = 0; y < altura; y++) {
    vhgw1d(src, sc.tmp, y * largura, 1, largura, raio, maximo, sc.g, sc.h);
  }
  for (let x = 0; x < largura; x++) {
    vhgw1d(sc.tmp, dst, x, largura, altura, raio, maximo, sc.g, sc.h);
  }
}

/** Máscaras são 0/1; escalamos para 0/255 internamente para o mín/máx funcionar. */
export function dilatar(
  src: Uint8Array,
  dst: Uint8Array,
  largura: number,
  altura: number,
  raio: number,
  sc: Rascunho,
): void {
  aplicar(src, dst, largura, altura, raio, true, sc);
}

export function erodir(
  src: Uint8Array,
  dst: Uint8Array,
  largura: number,
  altura: number,
  raio: number,
  sc: Rascunho,
): void {
  aplicar(src, dst, largura, altura, raio, false, sc);
}

/** Abertura: remove o salpico fino da palha sem engordar os fragmentos. */
export function abrir(
  src: Uint8Array,
  dst: Uint8Array,
  largura: number,
  altura: number,
  raio: number,
  sc: Rascunho,
): void {
  if (raio <= 0) {
    dst.set(src);
    return;
  }
  erodir(src, sc.meio, largura, altura, raio, sc);
  dilatar(sc.meio, dst, largura, altura, raio, sc);
}

/**
 * Fechamento: costura os gomos e as rachaduras longitudinais do colmo.
 *
 * Acima de raio 3 o fechamento passa a fundir fragmentos vizinhos num
 * aglomerado só, destruindo a contagem por classe — a interface trava o
 * controle em 4 e avisa a partir de 3.
 */
export function fechar(
  src: Uint8Array,
  dst: Uint8Array,
  largura: number,
  altura: number,
  raio: number,
  sc: Rascunho,
): void {
  if (raio <= 0) {
    dst.set(src);
    return;
  }
  dilatar(src, sc.meio, largura, altura, raio, sc);
  erodir(sc.meio, dst, largura, altura, raio, sc);
}

/**
 * Preenche buracos internos (nós, reflexos) por inundação do fundo a partir da
 * borda. Fila explícita — nunca recursão, que estoura a pilha em imagens
 * grandes.
 */
export function preencherBuracos(
  src: Uint8Array,
  dst: Uint8Array,
  largura: number,
  altura: number,
  sc: Rascunho,
): void {
  const n = largura * altura;
  const externo = sc.meio;
  externo.fill(0);
  const fila = sc.fila;
  let cauda = 0;

  const empilhar = (i: number) => {
    if (src[i] === 0 && externo[i] === 0) {
      externo[i] = 1;
      fila[cauda++] = i;
    }
  };

  for (let x = 0; x < largura; x++) {
    empilhar(x);
    empilhar((altura - 1) * largura + x);
  }
  for (let y = 0; y < altura; y++) {
    empilhar(y * largura);
    empilhar(y * largura + largura - 1);
  }

  let cabeca = 0;
  while (cabeca < cauda) {
    const i = fila[cabeca++];
    const x = i % largura;
    if (x > 0) empilhar(i - 1);
    if (x < largura - 1) empilhar(i + 1);
    if (i >= largura) empilhar(i - largura);
    if (i < n - largura) empilhar(i + largura);
  }

  for (let i = 0; i < n; i++) dst[i] = src[i] === 1 || externo[i] === 0 ? 1 : 0;
}
