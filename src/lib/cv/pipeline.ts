/**
 * Orquestrador do pipeline de visão.
 *
 * Dividido em dois estágios com cache. Os mapas de cor custam caro e só mudam
 * quando a imagem muda; tudo o que um slider afeta vive no segundo estágio, que
 * roda em dezenas de milissegundos. É o que torna o ajuste ao vivo possível.
 */

import { construirMapas } from './cor';
import { rotularComponentes } from './componentes';
import { extrairFeatures } from './features';
import {
  fracaoAcima,
  histerese,
  histograma256,
  limiarPorJoelho,
  otsuDoisNiveis,
} from './histograma';
import { classificar, type ParametrosMassa } from './classificador';
import {
  abrir,
  criarRascunho,
  fechar,
  preencherBuracos,
  type Rascunho,
} from './morfologia';
import { DIMENSAO_PROC_PADRAO, reduzirImagem } from './reduzir';
import type { MapasFeature, ParametrosSegmentacao, ResultadoPipeline } from './tipos';

export interface ContextoImagem {
  mapas: MapasFeature;
  rascunho: Rascunho;
  mascaraA: Uint8Array;
  mascaraB: Uint8Array;
  cmPorPx: number;
  /** Fator de redução aplicado; 1 quando a imagem já cabia no orçamento. */
  fatorReducao: number;
  /** Tempo de construção dos mapas, exibido na interface. */
  msMapas: number;
}

/** Estágio 1 — roda uma vez por imagem. */
export function prepararImagem(
  imagem: ImageData,
  cmPorPx: number,
  pesoLuminancia: number,
  dimensaoMaxima = DIMENSAO_PROC_PADRAO,
): ContextoImagem {
  const t0 = performance.now();
  const reduzida = reduzirImagem(imagem, cmPorPx, dimensaoMaxima);
  const mapas = construirMapas(reduzida.imagem, { pesoLuminancia });
  const n = mapas.largura * mapas.altura;
  return {
    mapas,
    rascunho: criarRascunho(mapas.largura, mapas.altura),
    mascaraA: new Uint8Array(n),
    mascaraB: new Uint8Array(n),
    cmPorPx: reduzida.cmPorPx,
    fatorReducao: reduzida.fator,
    msMapas: performance.now() - t0,
  };
}

/** Estágio 2 — roda a cada movimento de slider. */
export function processar(
  ctx: ContextoImagem,
  p: ParametrosSegmentacao,
  pm: ParametrosMassa,
): ResultadoPipeline {
  const { mapas, rascunho } = ctx;
  const { largura, altura, D, A } = mapas;
  const n = largura * altura;
  const tempos: Record<string, number> = { mapas: ctx.msMapas };

  // --- Limiarização por histerese ---
  let t = performance.now();

  // Otsu de três classes separa solo, palha e cana; o limiar superior isola a
  // cana e vira a semente. O inferior recupera bordas sombreadas e gomos.
  let limiarAlto: number;
  let limiarBaixo: number;
  if (p.automatico) {
    const hist = histograma256(D);
    const [t1, t2] = otsuDoisNiveis(hist, n);
    limiarAlto = Math.max(0, Math.min(255, t2 + p.desvioLimiar));

    // Salvaguarda: o Otsu pressupõe três populações com peso comparável. Numa
    // parcela de perda baixa, os fragmentos ocupam 1% ou 2% da cena e o
    // algoritmo passa a repartir o próprio solo — o limiar despenca e a imagem
    // inteira vira um componente só. Perda de colheita nunca cobre um quarto do
    // quadro; quando a segmentação afirma isso, o automático falhou, e o corte
    // passa a vir do percentil do canal de decisão.
    if (fracaoAcima(hist, n, limiarAlto) > p.fracaoMaximaObjeto) {
      limiarAlto = limiarPorJoelho(hist, n) + p.desvioLimiar;
      limiarBaixo = Math.max(0, limiarAlto - (limiarAlto - t1) * p.fracaoHisterese * 0.4);
    } else {
      limiarBaixo = Math.max(0, limiarAlto - (t2 - t1) * p.fracaoHisterese);
    }
  } else {
    limiarAlto = p.limiarManual;
    limiarBaixo = Math.max(0, limiarAlto * (1 - p.fracaoHisterese));
  }

  const forte = ctx.mascaraB;
  const mascara = ctx.mascaraA;
  for (let i = 0; i < n; i++) {
    forte[i] = D[i] >= limiarAlto ? 1 : 0;
    let fraco = D[i] >= limiarBaixo;
    // Ramo verde: as pontas têm b* baixo e não passam pelo canal de decisão,
    // mas se distinguem pelo a* negativo. Sem esta união elas somem.
    if (!fraco && p.ramoVerde) fraco = A[i] <= p.aVerdeMax && mapas.L[i] >= 400;
    mascara[i] = fraco ? 1 : 0;
  }
  histerese(forte, mascara, largura, altura, rascunho.fila);
  const limiar = limiarAlto;
  tempos.limiar = performance.now() - t;

  // --- Morfologia ---
  t = performance.now();
  let atual = mascara;
  let outro = forte;

  if (p.raioAbertura > 0) {
    abrir(atual, outro, largura, altura, p.raioAbertura, rascunho);
    [atual, outro] = [outro, atual];
  }
  if (p.raioFechamento > 0) {
    fechar(atual, outro, largura, altura, p.raioFechamento, rascunho);
    [atual, outro] = [outro, atual];
  }
  if (p.preencherBuracos) {
    preencherBuracos(atual, outro, largura, altura, rascunho);
    [atual, outro] = [outro, atual];
  }
  tempos.morfologia = performance.now() - t;

  // --- Componentes conexos ---
  t = performance.now();
  const rot = rotularComponentes(atual, largura, altura);
  tempos.componentes = performance.now() - t;

  // --- Features e classificação ---
  t = performance.now();
  const areaMinimaPx = p.areaMinimaCm2 / (ctx.cmPorPx * ctx.cmPorPx);
  const { componentes, manter } = extrairFeatures(rot, {
    largura,
    altura,
    cmPorPx: ctx.cmPorPx,
    areaMinimaPx,
    A,
  });

  const deteccoes = componentes
    .map((c) => classificar(c, pm))
    .filter((d) => d.classe !== 'rejeitado');

  for (let c = 1; c <= rot.quantidade; c++) manter[c] = 0;
  for (const d of deteccoes) manter[d.id] = 1;
  tempos.features = performance.now() - t;

  return {
    deteccoes,
    limiarUsado: limiar,
    mascara: atual,
    rotulos: rot.rotulos,
    manter,
    larguraProc: largura,
    alturaProc: altura,
    cmPorPxProc: ctx.cmPorPx,
    tempos,
  };
}
