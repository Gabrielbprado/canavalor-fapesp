/**
 * Extração das features geométricas de cada componente.
 *
 * Momentos de imagem acumulados em uma única varredura, na forma "structure of
 * arrays" — sem alocar um objeto por componente dentro do laço quente.
 */

import type { ResultadoRotulagem } from './componentes';
import {
  areaPoligono,
  comprimentoFibra,
  fechoConvexo,
  perimetroCadeia,
  retanguloMinimo,
  tracarContorno,
} from './geometria';
import type { Componente } from './tipos';

export interface OpcoesFeatures {
  largura: number;
  altura: number;
  cmPorPx: number;
  areaMinimaPx: number;
  /** a* × 10, usado para identificar fragmentos esverdeados (pontas). */
  A: Int16Array;
}

export function extrairFeatures(
  rot: ResultadoRotulagem,
  opts: OpcoesFeatures,
): { componentes: Componente[]; manter: Uint8Array } {
  const { largura, altura, cmPorPx, areaMinimaPx, A } = opts;
  const n = rot.quantidade;
  const manter = new Uint8Array(n + 1);

  // Momentos brutos, um array por acumulador
  const m00 = new Float64Array(n + 1);
  const m10 = new Float64Array(n + 1);
  const m01 = new Float64Array(n + 1);
  const m20 = new Float64Array(n + 1);
  const m11 = new Float64Array(n + 1);
  const m02 = new Float64Array(n + 1);
  const somaA = new Float64Array(n + 1);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const c = rot.rotulos[i];
      if (!c) continue;
      m00[c]++;
      m10[c] += x;
      m01[c] += y;
      m20[c] += x * x;
      m11[c] += x * y;
      m02[c] += y * y;
      somaA[c] += A[i];
    }
  }

  const componentes: Componente[] = [];

  for (let c = 1; c <= n; c++) {
    const area = m00[c];
    if (area < areaMinimaPx * 0.4) continue; // descarte imediato do ruído fino

    const cx = m10[c] / area;
    const cy = m01[c] / area;

    // Momentos centrais, forma computacional de uma passada
    const mu20 = m20[c] - cx * m10[c];
    const mu11 = m11[c] - cx * m01[c];
    const mu02 = m02[c] - cy * m01[c];

    // Normalizados, com a correção de área do pixel (+1/12). Ela muda a largura
    // de objetos finos — como as lascas — em vários por cento.
    const n20 = mu20 / area + 1 / 12;
    const n11 = mu11 / area;
    const n02 = mu02 / area + 1 / 12;

    const theta = 0.5 * Math.atan2(2 * n11, n20 - n02);
    const disc = Math.sqrt(4 * n11 * n11 + (n20 - n02) * (n20 - n02));
    const lambda1 = (n20 + n02 + disc) / 2;
    const lambda2 = (n20 + n02 - disc) / 2;
    const excentricidade =
      lambda1 > 1e-9 ? Math.sqrt(Math.max(0, 1 - lambda2 / lambda1)) : 0;

    const b = c * 4;
    const bbox: [number, number, number, number] = [
      rot.bboxes[b],
      rot.bboxes[b + 1],
      rot.bboxes[b + 2],
      rot.bboxes[b + 3],
    ];

    // O contorno de um componente tem no máximo ~2×(largura+altura) da bbox
    // passos; a folga de 4× cobre formas reentrantes sem permitir divergência.
    const maxPassos = 8 * (bbox[2] - bbox[0] + bbox[3] - bbox[1] + 2) + 32;
    const inicio = rot.inicios[c];
    const contorno = tracarContorno(
      rot.rotulos,
      largura,
      altura,
      c,
      inicio % largura,
      (inicio / largura) | 0,
      maxPassos,
    );
    if (contorno.length < 2) continue;

    const perimetro = perimetroCadeia(contorno);
    const casco = fechoConvexo(contorno);
    const areaCasco = Math.max(areaPoligono(casco), area);
    const obb = retanguloMinimo(casco);

    const solidez = area / areaCasco;
    const extensao = obb.w * obb.h > 0 ? area / (obb.w * obb.h) : 0;

    // Comprimento: o retângulo mínimo subestima colmos curvos; nesses casos o
    // modelo de fibra recupera o comprimento do eixo. A escolha é registrada
    // porque muda a medida e a banca vai perguntar.
    let comprimentoPx = Math.max(obb.w, 1);
    let larguraPx = Math.max(obb.h, 1);
    let origemComprimento: 'obb' | 'fibra' = 'obb';

    if (excentricidade > 0.93 && extensao < 0.62) {
      const fibra = comprimentoFibra(area, perimetro);
      if (fibra && fibra.comprimento > comprimentoPx) {
        comprimentoPx = fibra.comprimento;
        larguraPx = Math.max(fibra.largura, 0.5);
        origemComprimento = 'fibra';
      }
    }

    const areaCm2 = area * cmPorPx * cmPorPx;
    const comprimentoCm = comprimentoPx * cmPorPx;
    const larguraCm = larguraPx * cmPorPx;

    const aglomerado =
      (areaCm2 > 600 && solidez < 0.65) || (excentricidade < 0.8 && areaCm2 > 300);

    componentes.push({
      id: c,
      areaPx: area,
      areaCm2,
      cx,
      cy,
      theta,
      excentricidade,
      perimetroPx: perimetro,
      solidez,
      extensao,
      obb,
      comprimentoCm,
      larguraCm,
      razaoAspecto: comprimentoCm / Math.max(larguraCm, 1e-6),
      origemComprimento,
      aMediano: somaA[c] / area,
      aglomerado,
      bbox,
    });
    manter[c] = 1;
  }

  return { componentes, manter };
}
