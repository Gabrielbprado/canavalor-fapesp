/**
 * Conversões de cor e construção dos mapas de feature.
 *
 * O canal de decisão usa CIELab, não HSV. O motivo é concreto: em HSV, solo
 * marrom e palha bege compartilham o matiz (ambos em torno de 20–45°), então o
 * matiz é um discriminante fraco. O que separa colmo de palha é luminância
 * (L*, +12 a +20) somada à "amarelidão" (b*, +8 a +15) — daí a projeção linear
 * D = wL·L* + wb·b*, sobre a qual Otsu encontra o limiar.
 *
 * Esta etapa roda uma vez por imagem; nenhum slider a dispara de novo.
 */

import type { MapasFeature } from './tipos';

/** sRGB 8 bits → linear. Tabela de 256 entradas: elimina 3 pow() por pixel. */
const LUT_LINEAR = (() => {
  const lut = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    lut[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return lut;
})();

// Branco D65
const XN = 0.95047;
const YN = 1.0;
const ZN = 1.08883;
const DELTA3 = 0.008856; // (6/29)³
const K = 7.787037; // 1/(3δ²)

function f(t: number): number {
  return t > DELTA3 ? Math.cbrt(t) : K * t + 16 / 116;
}

export interface OpcoesMapas {
  pesoLuminancia: number;
}

export function construirMapas(src: ImageData, opts: OpcoesMapas): MapasFeature {
  const { width: largura, height: altura, data } = src;
  const n = largura * altura;

  const L = new Int16Array(n);
  const A = new Int16Array(n);
  const B = new Int16Array(n);
  const H = new Uint16Array(n);
  const S = new Uint8Array(n);
  const V = new Uint8Array(n);
  const D = new Uint8Array(n);

  const wL = opts.pesoLuminancia;
  const wb = 1 - wL;

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r8 = data[p];
    const g8 = data[p + 1];
    const b8 = data[p + 2];

    // --- CIELab ---
    const r = LUT_LINEAR[r8];
    const g = LUT_LINEAR[g8];
    const b = LUT_LINEAR[b8];

    const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;

    const fx = f(x / XN);
    const fy = f(y / YN);
    const fz = f(z / ZN);

    const Ls = 116 * fy - 16;
    const as = 500 * (fx - fy);
    const bs = 200 * (fy - fz);

    L[i] = Ls * 10;
    A[i] = as * 10;
    B[i] = bs * 10;

    // --- HSV, sobre os valores 8 bits ---
    const max = r8 > g8 ? (r8 > b8 ? r8 : b8) : g8 > b8 ? g8 : b8;
    const min = r8 < g8 ? (r8 < b8 ? r8 : b8) : g8 < b8 ? g8 : b8;
    const d = max - min;

    V[i] = max;
    S[i] = max === 0 ? 0 : (d * 255) / max;

    let h = 0;
    if (d !== 0) {
      if (max === r8) h = 60 * (((g8 - b8) / d + 6) % 6);
      else if (max === g8) h = 60 * ((b8 - r8) / d + 2);
      else h = 60 * ((r8 - g8) / d + 4);
    }
    H[i] = h;

    // --- Canal de decisão ---
    const Ln = Ls / 100;
    const bn = bs / 60 < 0 ? 0 : bs / 60 > 1 ? 1 : bs / 60;
    const dec = 255 * (wL * Ln + wb * bn);
    D[i] = dec < 0 ? 0 : dec > 255 ? 255 : dec;
  }

  return { largura, altura, L, A, B, H, S, V, D };
}
