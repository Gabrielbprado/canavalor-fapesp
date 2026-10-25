import type { ClassePerda } from '../dominio';

/** Mapas de feature calculados uma vez por imagem e reaproveitados pelos sliders. */
export interface MapasFeature {
  largura: number;
  altura: number;
  /** L* × 10 (0..1000) */
  L: Int16Array;
  /** a* × 10 */
  A: Int16Array;
  /** b* × 10 */
  B: Int16Array;
  /** Matiz 0..359 */
  H: Uint16Array;
  S: Uint8Array;
  V: Uint8Array;
  /** Canal de decisão projetado a partir de L* e b*. */
  D: Uint8Array;
}

export interface ParametrosSegmentacao {
  /** Limiar automático (Otsu) ou manual. */
  automatico: boolean;
  /** Deslocamento aplicado sobre o limiar de Otsu, −60..+60. */
  desvioLimiar: number;
  limiarManual: number;
  /**
   * Distância entre os dois limiares da histerese, como fração do intervalo
   * entre as classes de palha e de cana.
   */
  fracaoHisterese: number;
  /**
   * Fração máxima da cena que a perda pode ocupar. Serve de salvaguarda contra
   * o colapso do limiar automático em parcelas com pouquíssimos fragmentos.
   */
  fracaoMaximaObjeto: number;
  /** Peso de L* na projeção; o de b* é o complemento. */
  pesoLuminancia: number;
  /** Resgata pontas esverdeadas, que o canal D sozinho perde. */
  ramoVerde: boolean;
  aVerdeMax: number;
  /** Raios dos operadores morfológicos, em pixels de processamento. */
  raioAbertura: number;
  raioFechamento: number;
  preencherBuracos: boolean;
  /** Área mínima do componente, em cm². */
  areaMinimaCm2: number;
}

/**
 * Padrões calibrados por varredura sobre as quatro cenas sintéticas
 * (`scripts/calibrar.mjs`, 405 combinações), minimizando conjuntamente o erro
 * de massa, o pior caso e o erro de contagem.
 *
 * Resultado: erro absoluto médio de massa de 14,9% (meta do projeto: <= 15%),
 * com contagem de 10/14/23/30 detecções contra 9/14/25/32 fragmentos reais.
 *
 * A contagem entra no critério de propósito. Existem ajustes com erro de massa
 * menor — 12,9% — que chegam lá detectando 67 fragmentos onde há 32: acertam o
 * total por compensação de erros, contando palha como cana. Esse acerto é falso,
 * porque é a contagem por classe que alimenta os fatores de ATR diferenciados.
 *
 * Estes valores foram ajustados NESSAS cenas: são ponto de partida, não
 * calibração de campo. Todos continuam expostos na interface exatamente porque
 * calibrar contra pesagem pareada é o objeto da Fase 2.
 */
export const PARAMETROS_PADRAO: ParametrosSegmentacao = {
  automatico: true,
  desvioLimiar: -8,
  limiarManual: 128,
  fracaoHisterese: 0.5,
  fracaoMaximaObjeto: 0.06,
  pesoLuminancia: 0.6,
  ramoVerde: true,
  aVerdeMax: 20,
  raioAbertura: 1,
  raioFechamento: 3,
  preencherBuracos: true,
  areaMinimaCm2: 2.0,
};

export interface Componente {
  id: number;
  areaPx: number;
  areaCm2: number;
  cx: number;
  cy: number;
  /** Orientação do eixo maior, em radianos. */
  theta: number;
  excentricidade: number;
  perimetroPx: number;
  solidez: number;
  extensao: number;
  /** Retângulo orientado de área mínima, em px de processamento. */
  obb: { cx: number; cy: number; w: number; h: number; angulo: number };
  comprimentoCm: number;
  larguraCm: number;
  razaoAspecto: number;
  /** 'obb' ou 'fibra' — declarado porque muda a medida de comprimento. */
  origemComprimento: 'obb' | 'fibra';
  /** Mediana de a* × 10 na componente; negativo indica verde. */
  aMediano: number;
  aglomerado: boolean;
  bbox: [number, number, number, number];
}

export interface Deteccao extends Componente {
  classe: ClassePerda | 'agregado' | 'rejeitado';
  confianca: number;
  ambiguo: boolean;
  massaKg: number;
  massaMinKg: number;
  massaMaxKg: number;
}

export interface ResultadoPipeline {
  deteccoes: Deteccao[];
  limiarUsado: number;
  mascara: Uint8Array;
  rotulos: Int32Array;
  manter: Uint8Array;
  larguraProc: number;
  alturaProc: number;
  cmPorPxProc: number;
  /** Milissegundos por estágio, exibidos na interface. */
  tempos: Record<string, number>;
}
