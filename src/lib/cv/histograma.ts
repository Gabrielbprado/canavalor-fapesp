/** Histograma de 256 níveis e limiar de Otsu. */

export function histograma256(src: Uint8Array): Uint32Array {
  const h = new Uint32Array(256);
  for (let i = 0; i < src.length; i++) h[src[i]]++;
  return h;
}

/**
 * Limiar de Otsu: maximiza a variância entre as duas classes.
 * Retorna o nível 0..255 que melhor separa fundo e objeto.
 */
export function otsu(hist: Uint32Array, total: number): number {
  let somaTotal = 0;
  for (let i = 0; i < 256; i++) somaTotal += i * hist[i];

  let pesoFundo = 0;
  let somaFundo = 0;
  let melhor = 0;
  let melhorVar = -1;

  for (let t = 0; t < 256; t++) {
    pesoFundo += hist[t];
    if (pesoFundo === 0) continue;
    const pesoFrente = total - pesoFundo;
    if (pesoFrente === 0) break;

    somaFundo += t * hist[t];
    const mediaFundo = somaFundo / pesoFundo;
    const mediaFrente = (somaTotal - somaFundo) / pesoFrente;
    const diff = mediaFundo - mediaFrente;
    const varEntre = pesoFundo * pesoFrente * diff * diff;

    if (varEntre > melhorVar) {
      melhorVar = varEntre;
      melhor = t;
    }
  }
  return melhor;
}

/**
 * Otsu de dois limiares (três classes).
 *
 * Com duas classes o corte cai entre o solo e o conjunto palha+cana, e a palha
 * entra como falso positivo — foi o que se observou nas cenas de teste. A cena
 * pós-colheita tem de fato três populações: solo escuro, palha intermediária e
 * fragmentos de cana claros. Buscar dois limiares separa as três, e o limiar
 * superior é o que isola a cana.
 *
 * Busca exaustiva sobre os 256 níveis com somas acumuladas: ~32 mil combinações,
 * custo desprezível diante de uma passada na imagem.
 */
export function otsuDoisNiveis(hist: Uint32Array, total: number): [number, number] {
  const p = new Float64Array(257);
  const s = new Float64Array(257);
  for (let i = 0; i < 256; i++) {
    p[i + 1] = p[i] + hist[i] / total;
    s[i + 1] = s[i] + (i * hist[i]) / total;
  }

  // Variância entre classes, por soma dos termos w·μ² de cada classe
  const termo = (a: number, b: number) => {
    const w = p[b] - p[a];
    if (w <= 1e-12) return 0;
    const m = (s[b] - s[a]) / w;
    return w * m * m;
  };

  let melhor = -1;
  let t1 = 85;
  let t2 = 170;

  for (let a = 1; a < 254; a++) {
    const parteA = termo(0, a);
    for (let b = a + 1; b < 255; b++) {
      const v = parteA + termo(a, b) + termo(b, 256);
      if (v > melhor) {
        melhor = v;
        t1 = a;
        t2 = b;
      }
    }
  }
  return [t1, t2];
}

/**
 * Limiarização por histerese, sobre a máscara já calculada.
 *
 * Um corte único não serve aqui. O colmo tem sombreamento cilíndrico nas bordas
 * e anéis escuros nos gomos: com o limiar alto o suficiente para excluir a
 * palha, cada fragmento se parte em vários pedaços, e um tolete vira três
 * lascas. Com histerese, os pixels bem claros são sementes e os intermediários
 * entram apenas se estiverem conectados a uma semente — as bordas e os gomos
 * são recuperados, a palha isolada continua fora.
 *
 * `forte` e `fraca` são máscaras 0/1 do mesmo tamanho; o resultado sobrescreve
 * `fraca` com os componentes que contêm ao menos uma semente.
 */
export function histerese(
  forte: Uint8Array,
  fraca: Uint8Array,
  largura: number,
  altura: number,
  fila: Int32Array,
): void {
  const n = largura * altura;
  let cauda = 0;

  for (let i = 0; i < n; i++) {
    if (forte[i] === 1 && fraca[i] === 1) {
      fraca[i] = 2; // marca como aceito
      fila[cauda++] = i;
    }
  }

  let cabeca = 0;
  while (cabeca < cauda) {
    const i = fila[cabeca++];
    const x = i % largura;
    const y = (i / largura) | 0;

    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= altura) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= largura) continue;
        const j = ny * largura + nx;
        if (fraca[j] === 1) {
          fraca[j] = 2;
          fila[cauda++] = j;
        }
      }
    }
  }

  for (let i = 0; i < n; i++) fraca[i] = fraca[i] === 2 ? 1 : 0;
}

/** Nível abaixo do qual está a fração `p` dos pixels. */
export function percentil(hist: Uint32Array, total: number, p: number): number {
  const alvo = total * p;
  let acumulado = 0;
  for (let i = 0; i < 256; i++) {
    acumulado += hist[i];
    if (acumulado >= alvo) return i;
  }
  return 255;
}

/**
 * Limiar pelo joelho da cauda do histograma.
 *
 * O solo forma um pico forte e os fragmentos, uma cauda rala. Enquanto ainda
 * estamos dentro do fundo, subir o corte derruba rápido a fração de pixels
 * incluídos; depois que o fundo acaba, subir mais quase não muda nada. O ponto
 * onde a curva achata é a fronteira.
 *
 * É o que torna a segmentação estável em parcelas de perda baixa, onde os
 * fragmentos ocupam menos de 1% da cena e qualquer variante de Otsu passa a
 * repartir o próprio solo em vez de isolar a cana.
 */
export function limiarPorJoelho(hist: Uint32Array, total: number, passo = 10): number {
  let moda = 0;
  for (let i = 0; i < 256; i++) if (hist[i] > hist[moda]) moda = i;

  for (let t = moda + passo; t < 255 - passo; t++) {
    const aqui = fracaoAcima(hist, total, t);
    if (aqui <= 0) return t;
    // A cauda achatou: daqui para cima já não é mais fundo.
    if (fracaoAcima(hist, total, t + passo) / aqui > 0.65) return t;
  }
  return moda + 3 * passo;
}

/** Fração de pixels em `hist` com valor maior ou igual a `limiar`. */
export function fracaoAcima(hist: Uint32Array, total: number, limiar: number): number {
  let acumulado = 0;
  for (let i = limiar; i < 256; i++) acumulado += hist[i];
  return total > 0 ? acumulado / total : 0;
}
