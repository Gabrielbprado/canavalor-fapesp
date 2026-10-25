/**
 * Rotulação de componentes conexos, 8-conectividade, em duas passadas com
 * union-find. Escolha deliberada: com muitos objetos pequenos — que é o caso de
 * um talhão salpicado de lascas — é bem mais rápido que uma busca em largura
 * por componente, e tem localidade de cache muito melhor.
 */

export interface ResultadoRotulagem {
  rotulos: Int32Array;
  quantidade: number;
  /** Área em pixels, indexada por rótulo (1..quantidade). */
  areas: Int32Array;
  /** x0, y0, x1, y1 por rótulo, achatado em grupos de 4. */
  bboxes: Int32Array;
  /**
   * Índice do primeiro pixel de cada componente na varredura por linhas.
   *
   * Não é o canto da bbox: o canto (x_min, y_min) costuma cair no fundo para
   * qualquer forma que não seja um retângulo, e partir dele faz o rastreamento
   * de contorno falhar de imediato.
   */
  inicios: Int32Array;
}

export function rotularComponentes(
  mascara: Uint8Array,
  largura: number,
  altura: number,
): ResultadoRotulagem {
  const n = largura * altura;
  const rotulos = new Int32Array(n);
  const maxRotulos = (n >> 2) + 16;
  const pai = new Int32Array(maxRotulos);

  function raiz(x: number): number {
    let r = x;
    while (pai[r] !== r) r = pai[r];
    // compressão de caminho, iterativa
    while (pai[x] !== r) {
      const p = pai[x];
      pai[x] = r;
      x = p;
    }
    return r;
  }

  function unir(a: number, b: number): void {
    const ra = raiz(a);
    const rb = raiz(b);
    if (ra === rb) return;
    if (ra < rb) pai[rb] = ra;
    else pai[ra] = rb;
  }

  let proximo = 1;

  // Passada 1 — vizinhos já visitados em 8-conectividade: NO, N, NE, O
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      if (mascara[i] === 0) continue;

      const no = x > 0 && y > 0 ? rotulos[i - largura - 1] : 0;
      const nn = y > 0 ? rotulos[i - largura] : 0;
      const ne = x < largura - 1 && y > 0 ? rotulos[i - largura + 1] : 0;
      const oo = x > 0 ? rotulos[i - 1] : 0;

      let menor = 0;
      if (no && (menor === 0 || no < menor)) menor = no;
      if (nn && (menor === 0 || nn < menor)) menor = nn;
      if (ne && (menor === 0 || ne < menor)) menor = ne;
      if (oo && (menor === 0 || oo < menor)) menor = oo;

      if (menor === 0) {
        if (proximo >= maxRotulos) continue; // salvaguarda: máscara degenerada
        pai[proximo] = proximo;
        rotulos[i] = proximo++;
      } else {
        rotulos[i] = menor;
        if (no && no !== menor) unir(no, menor);
        if (nn && nn !== menor) unir(nn, menor);
        if (ne && ne !== menor) unir(ne, menor);
        if (oo && oo !== menor) unir(oo, menor);
      }
    }
  }

  // Passada 2 — compacta os rótulos e acumula área e bbox no mesmo laço
  const remapa = new Int32Array(proximo);
  let quantidade = 0;
  const areasTmp = new Int32Array(proximo);
  const bboxesTmp = new Int32Array(proximo * 4);
  const iniciosTmp = new Int32Array(proximo);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const l = rotulos[i];
      if (!l) continue;

      const r = raiz(l);
      let c = remapa[r];
      if (c === 0) {
        c = ++quantidade;
        remapa[r] = c;
        iniciosTmp[c] = i; // primeira ocorrência na varredura: menor y, menor x
        bboxesTmp[c * 4] = x;
        bboxesTmp[c * 4 + 1] = y;
        bboxesTmp[c * 4 + 2] = x;
        bboxesTmp[c * 4 + 3] = y;
      }
      rotulos[i] = c;
      areasTmp[c]++;

      const b = c * 4;
      if (x < bboxesTmp[b]) bboxesTmp[b] = x;
      if (y < bboxesTmp[b + 1]) bboxesTmp[b + 1] = y;
      if (x > bboxesTmp[b + 2]) bboxesTmp[b + 2] = x;
      if (y > bboxesTmp[b + 3]) bboxesTmp[b + 3] = y;
    }
  }

  return {
    rotulos,
    quantidade,
    areas: areasTmp.slice(0, quantidade + 1),
    bboxes: bboxesTmp.slice(0, (quantidade + 1) * 4),
    inicios: iniciosTmp.slice(0, quantidade + 1),
  };
}
