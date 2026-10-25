/** Contorno, fecho convexo e retângulo orientado de área mínima. */

export interface Obb {
  cx: number;
  cy: number;
  w: number;
  h: number;
  angulo: number;
}

/**
 * Contorno externo por rastreamento de Moore, com critério de parada de Jacob.
 * Retorna pares x,y intercalados.
 */
export function tracarContorno(
  rotulos: Int32Array,
  largura: number,
  altura: number,
  rotulo: number,
  x0: number,
  y0: number,
  /** Perímetro máximo aceito, derivado da bbox do componente. Sem este limite,
   *  um contorno degenerado percorreria a imagem inteira milhares de vezes. */
  maxPassos = 4096,
): Int32Array {
  const pontos: number[] = [];
  // vizinhança de Moore em sentido horário, começando em oeste
  const dx = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];

  const dentro = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < largura && y < altura && rotulos[y * largura + x] === rotulo;

  let cx = x0;
  let cy = y0;
  let dir = 0;

  // Critério de parada de Jacob, na forma da aresta inicial: o contorno fecha
  // quando repetimos o primeiro movimento (do pixel inicial para o seguinte).
  // Comparar só a posição não basta — um contorno em gargalo passa duas vezes
  // pelo mesmo pixel, e a direção de busca no primeiro passo é arbitrária.
  let primeiroDestino = -1;

  for (let passo = 0; passo < maxPassos; passo++) {
    pontos.push(cx, cy);

    let achou = false;
    for (let k = 1; k <= 8; k++) {
      const d = (dir + k) & 7;
      const nx = cx + dx[d];
      const ny = cy + dy[d];
      if (!dentro(nx, ny)) continue;

      const destino = ny * largura + nx;
      if (primeiroDestino === -1) {
        primeiroDestino = destino;
      } else if (cx === x0 && cy === y0 && destino === primeiroDestino) {
        pontos.length -= 2; // o pixel inicial já está no começo da lista
        return Int32Array.from(pontos);
      }

      cx = nx;
      cy = ny;
      dir = (d + 5) & 7; // recua para pouco antes do vizinho de entrada
      achou = true;
      break;
    }
    if (!achou) break; // pixel isolado
  }
  return Int32Array.from(pontos);
}

/**
 * Perímetro por código de cadeia. O fator 0,95 corrige o viés conhecido do
 * perímetro digital, que sem ele sai ~5% inflado e enviesa solidez e
 * circularidade.
 */
export function perimetroCadeia(contorno: Int32Array): number {
  const n = contorno.length / 2;
  if (n < 2) return 1;
  let orto = 0;
  let diag = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ddx = Math.abs(contorno[j * 2] - contorno[i * 2]);
    const ddy = Math.abs(contorno[j * 2 + 1] - contorno[i * 2 + 1]);
    if (ddx && ddy) diag++;
    else orto++;
  }
  return (orto + diag * Math.SQRT2) * 0.95;
}

/** Fecho convexo pela cadeia monótona de Andrew. */
export function fechoConvexo(pontos: Int32Array): Int32Array {
  const n = pontos.length / 2;
  if (n < 3) return pontos.slice();

  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const dx = pontos[a * 2] - pontos[b * 2];
    return dx !== 0 ? dx : pontos[a * 2 + 1] - pontos[b * 2 + 1];
  });

  const cruz = (o: number, a: number, b: number) =>
    (pontos[a * 2] - pontos[o * 2]) * (pontos[b * 2 + 1] - pontos[o * 2 + 1]) -
    (pontos[a * 2 + 1] - pontos[o * 2 + 1]) * (pontos[b * 2] - pontos[o * 2]);

  const construir = (ordem: number[]) => {
    const pilha: number[] = [];
    for (const i of ordem) {
      while (pilha.length >= 2 && cruz(pilha[pilha.length - 2], pilha[pilha.length - 1], i) <= 0)
        pilha.pop();
      pilha.push(i);
    }
    pilha.pop();
    return pilha;
  };

  const inferior = construir(idx);
  const superior = construir([...idx].reverse());
  const casco = [...inferior, ...superior];

  const saida = new Int32Array(casco.length * 2);
  casco.forEach((i, k) => {
    saida[k * 2] = pontos[i * 2];
    saida[k * 2 + 1] = pontos[i * 2 + 1];
  });
  return saida;
}

/** Área de um polígono pela fórmula do cadarço. */
export function areaPoligono(poli: Int32Array): number {
  const n = poli.length / 2;
  if (n < 3) return 0;
  let soma = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    soma += poli[i * 2] * poli[j * 2 + 1] - poli[j * 2] * poli[i * 2 + 1];
  }
  return Math.abs(soma) / 2;
}

/**
 * Retângulo orientado de área mínima, por calipers rotativos: um dos lados do
 * retângulo mínimo é sempre colinear com uma aresta do fecho convexo.
 */
export function retanguloMinimo(casco: Int32Array): Obb {
  const n = casco.length / 2;
  if (n < 2) {
    return { cx: casco[0] ?? 0, cy: casco[1] ?? 0, w: 1, h: 1, angulo: 0 };
  }

  let melhorArea = Infinity;
  let melhor: Obb = { cx: 0, cy: 0, w: 1, h: 1, angulo: 0 };

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = casco[j * 2] - casco[i * 2];
    const ey = casco[j * 2 + 1] - casco[i * 2 + 1];
    const comp = Math.hypot(ex, ey);
    if (comp < 1e-9) continue;

    const c = ex / comp;
    const s = ey / comp;

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;

    for (let k = 0; k < n; k++) {
      const px = casco[k * 2];
      const py = casco[k * 2 + 1];
      const u = px * c + py * s;
      const v = -px * s + py * c;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }

    const du = maxU - minU;
    const dv = maxV - minV;
    const area = du * dv;

    if (area < melhorArea) {
      melhorArea = area;
      const cu = (minU + maxU) / 2;
      const cv = (minV + maxV) / 2;
      // volta ao referencial da imagem
      const cx = cu * c - cv * s;
      const cy = cu * s + cv * c;
      const maior = Math.max(du, dv);
      const menor = Math.min(du, dv);
      const angulo = du >= dv ? Math.atan2(s, c) : Math.atan2(c, -s);
      melhor = { cx, cy, w: maior, h: menor, angulo };
    }
  }
  return melhor;
}

/**
 * Comprimento e largura pelo modelo de fibra, resolvendo A = L·W e P = 2(L+W).
 *
 * O retângulo orientado subestima muito o comprimento de um colmo curvo: uma
 * cana de 2 m com flecha acentuada pode render um retângulo de 1,5 m. O modelo
 * de fibra recupera o comprimento real do eixo.
 */
export function comprimentoFibra(
  area: number,
  perimetro: number,
): { comprimento: number; largura: number } | null {
  const disc = perimetro * perimetro - 16 * area;
  if (disc < 0) return null;
  const raiz = Math.sqrt(disc);
  const comprimento = (perimetro + raiz) / 4;
  const largura = (perimetro - raiz) / 4;
  if (comprimento <= 0 || largura <= 0) return null;
  return { comprimento, largura };
}
