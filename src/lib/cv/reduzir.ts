/**
 * Redução da imagem para a resolução de processamento.
 *
 * Processar 2,5 megapixels a cada movimento de slider é desperdício: os
 * fragmentos que interessam continuam perfeitamente resolvidos a 900 px no lado
 * maior — um tolete de 30 cm ainda ocupa mais de 50 px. A escala em cm por
 * pixel é corrigida junto, e é aí que moram os bugs de escala: todo limiar
 * expresso em centímetros precisa ficar imune à redução.
 */

/**
 * Lado maior da imagem de processamento. A 1400 px, a cena de 3,33 m rende
 * ~0,24 cm por pixel: a lasca mais fina (0,8 cm) ainda ocupa 3 px e sobrevive à
 * abertura morfológica. Abaixo disso as classes pequenas desaparecem.
 */
export const DIMENSAO_PROC_PADRAO = 1400;

export interface ImagemReduzida {
  imagem: ImageData;
  /** Fator aplicado: largura de processamento ÷ largura original. */
  fator: number;
  cmPorPx: number;
}

function criarImageData(largura: number, altura: number, dados: Uint8ClampedArray): ImageData {
  if (typeof ImageData !== 'undefined') return new ImageData(dados as unknown as Uint8ClampedArray<ArrayBuffer>, largura, altura);
  // Fora do navegador (testes em Node) basta a forma estrutural.
  return { width: largura, height: altura, data: dados, colorSpace: 'srgb' } as ImageData;
}

/** Média por caixa — preserva a massa de cor melhor que a amostragem simples. */
export function reduzirImagem(
  src: ImageData,
  cmPorPxOriginal: number,
  dimensaoMaxima = DIMENSAO_PROC_PADRAO,
): ImagemReduzida {
  const maior = Math.max(src.width, src.height);
  if (maior <= dimensaoMaxima) {
    return { imagem: src, fator: 1, cmPorPx: cmPorPxOriginal };
  }

  const fator = dimensaoMaxima / maior;
  const largura = Math.max(1, Math.round(src.width * fator));
  const altura = Math.max(1, Math.round(src.height * fator));
  const saida = new Uint8ClampedArray(largura * altura * 4);

  const escalaX = src.width / largura;
  const escalaY = src.height / altura;

  for (let y = 0; y < altura; y++) {
    const y0 = Math.floor(y * escalaY);
    const y1 = Math.min(src.height, Math.max(y0 + 1, Math.floor((y + 1) * escalaY)));

    for (let x = 0; x < largura; x++) {
      const x0 = Math.floor(x * escalaX);
      const x1 = Math.min(src.width, Math.max(x0 + 1, Math.floor((x + 1) * escalaX)));

      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;

      for (let sy = y0; sy < y1; sy++) {
        let p = (sy * src.width + x0) * 4;
        for (let sx = x0; sx < x1; sx++, p += 4) {
          r += src.data[p];
          g += src.data[p + 1];
          b += src.data[p + 2];
          n++;
        }
      }

      const d = (y * largura + x) * 4;
      saida[d] = r / n;
      saida[d + 1] = g / n;
      saida[d + 2] = b / n;
      saida[d + 3] = 255;
    }
  }

  return {
    imagem: criarImageData(largura, altura, saida),
    fator,
    // Menos pixels cobrindo a mesma cena: cada pixel passa a valer mais cm.
    cmPorPx: cmPorPxOriginal / fator,
  };
}
