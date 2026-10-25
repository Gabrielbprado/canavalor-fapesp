/**
 * Vocabulário compartilhado entre as três camadas do CanaValor.
 *
 * As cinco classes de perda são as definidas no projeto: cana inteira, tolete,
 * toco, ponta e lasca. Todos os coeficientes por classe abaixo são HIPÓTESES
 * PARAMETRIZÁVEIS — o projeto declara expressamente que serão calibrados em
 * campo (massa/densidade na Fase 2, fator de ATR na Fase 3). Nenhum deles vem
 * de fonte normativa, e a interface os exibe sempre com o selo correspondente.
 */

export type ClassePerda = 'inteira' | 'tolete' | 'toco' | 'ponta' | 'lasca';

/**
 * Cores das classes: paleta categórica em ordem fixa, jamais ciclada, e
 * verificada por validador (faixa de luminosidade, piso de croma, separação sob
 * daltonismo e piso de visão normal) contra a superfície de papel da interface.
 * A separação sob deuteranopia é de ΔE 9,2 no pior par adjacente.
 *
 * A cor nunca carrega a identidade sozinha: toda leitura tem rótulo direto ou
 * tabela ao lado.
 */

export const CLASSES: ClassePerda[] = ['inteira', 'tolete', 'toco', 'ponta', 'lasca'];

export interface PerfilClasse {
  id: ClassePerda;
  rotulo: string;
  descricao: string;
  cor: string;
  /** Comprimento típico do fragmento, em centímetros [mín, máx]. */
  comprimentoCm: [number, number];
  /** Largura/diâmetro típico, em centímetros [mín, máx]. */
  larguraCm: [number, number];
  /** Massa típica de um fragmento, em kg. HIPÓTESE — Fase 2. */
  massaKg: number;
  /** Intervalo de incerteza da massa, em kg. */
  massaIntervalo: [number, number];
  /**
   * Fator de ATR relativo ao colmo íntegro. HIPÓTESE — Fase 3.
   * A ponta é o caso extremo: o ápice tem teor de sacarose muito inferior.
   */
  fatorAtr: number;
  fatorAtrIntervalo: [number, number];
  /** Densidade linear aparente (kg por cm de comprimento). HIPÓTESE — Fase 2. */
  densidadeLinear: number;
  /** Densidade superficial aparente (kg por cm² de área projetada). HIPÓTESE — Fase 2. */
  densidadeSuperficial: number;
  /** Diâmetro nominal do fragmento, em cm. */
  diametroCm: number;
  /** Prioridade de detecção declarada no projeto (classes de maior massa). */
  prioritaria: boolean;
}

export const PERFIS: Record<ClassePerda, PerfilClasse> = {
  inteira: {
    id: 'inteira',
    rotulo: 'Cana inteira',
    descricao:
      'Pedaço de cana igual ou maior que dois terços do tamanho normal do colmo, ' +
      'deixado sobre o solo (critério CTC).',
    cor: '#2a78d6',
    comprimentoCm: [150, 290],
    larguraCm: [2.8, 4.0],
    massaKg: 1.9,
    massaIntervalo: [1.2, 2.8],
    fatorAtr: 1.0,
    fatorAtrIntervalo: [0.97, 1.0],
    densidadeLinear: 0.0090,
    densidadeSuperficial: 0.00235,
    diametroCm: 3.4,
    prioritaria: true,
  },
  tolete: {
    id: 'tolete',
    rotulo: 'Tolete',
    descricao:
      'Segmento de colmo cortado pelo picador da colhedora e não recolhido pelo ' +
      'sistema de limpeza.',
    cor: '#eb6834',
    comprimentoCm: [20, 40],
    larguraCm: [2.6, 3.9],
    massaKg: 0.24,
    massaIntervalo: [0.15, 0.36],
    fatorAtr: 0.98,
    fatorAtrIntervalo: [0.95, 1.0],
    densidadeLinear: 0.0080,
    densidadeSuperficial: 0.0026,
    diametroCm: 3.2,
    prioritaria: true,
  },
  toco: {
    id: 'toco',
    rotulo: 'Toco',
    descricao:
      'Base do colmo com menos de 20 cm, aderida à soqueira após o corte basal ' +
      '(critério CTC). Mais fibrosa e frequentemente com terra aderida.',
    cor: '#4a3aa7',
    comprimentoCm: [8, 18],
    larguraCm: [3.2, 5.2],
    massaKg: 0.21,
    massaIntervalo: [0.12, 0.32],
    fatorAtr: 0.9,
    fatorAtrIntervalo: [0.82, 0.95],
    densidadeLinear: 0.018,
    densidadeSuperficial: 0.0044,
    diametroCm: 4.5,
    prioritaria: false,
  },
  ponta: {
    id: 'ponta',
    rotulo: 'Ponta',
    descricao:
      'Ponteiro: extremidade apical com o feixe de folhas. Teor de sacarose muito ' +
      'inferior ao do colmo, o que justifica o fator de ATR próprio.',
    cor: '#1baf7a',
    comprimentoCm: [40, 90],
    larguraCm: [1.6, 3.0],
    massaKg: 0.55,
    massaIntervalo: [0.32, 0.82],
    fatorAtr: 0.5,
    fatorAtrIntervalo: [0.4, 0.6],
    densidadeLinear: 0.0095,
    densidadeSuperficial: 0.0039,
    diametroCm: 2.2,
    prioritaria: false,
  },
  lasca: {
    id: 'lasca',
    rotulo: 'Lasca',
    descricao:
      'Fragmento estilhaçado pelo mecanismo de corte ou pelo picador; pequeno, ' +
      'irregular, e a classe mais difícil de distinguir do solo.',
    cor: '#eda100',
    comprimentoCm: [3, 12],
    larguraCm: [0.8, 2.4],
    massaKg: 0.019,
    massaIntervalo: [0.008, 0.035],
    fatorAtr: 0.85,
    fatorAtrIntervalo: [0.75, 0.92],
    densidadeLinear: 0.0024,
    densidadeSuperficial: 0.00135,
    diametroCm: 1.5,
    prioritaria: false,
  },
};

/**
 * Método da armação: procedimento manual de referência que o CanaValor
 * substitui. Quadro de 10 m² (3,33 × 3 m), 4 repetições em pontos aleatórios.
 */
export const ARMACAO = {
  larguraM: 3.33,
  comprimentoM: 3,
  areaM2: 3.33 * 3,
  repeticoes: 4,
  ref: 'metodo.armacao',
} as const;

/** Classificação CTC de severidade da perda, em % da produtividade. */
export const SEVERIDADE = [
  { id: 'baixo', rotulo: 'Baixo', min: 0, max: 2.5, cor: '#1f7a4d', simbolo: '●' },
  { id: 'medio', rotulo: 'Médio', min: 2.5, max: 4.5, cor: '#b07b0a', simbolo: '◆' },
  { id: 'alto', rotulo: 'Alto', min: 4.5, max: Infinity, cor: '#c0392b', simbolo: '▲' },
] as const;

export type Severidade = (typeof SEVERIDADE)[number];

export function classificarSeveridade(percentual: number): Severidade {
  return SEVERIDADE.find((s) => percentual >= s.min && percentual < s.max) ?? SEVERIDADE[2];
}

/** Indicadores de mercado usados como referência na demonstração. */
export const MERCADO = {
  produtividadeTHa: 74.4,
  atrMedioKgT: 137.79,
  refUnica: 'mercado.unica-2025-26',
  precoAtrProjetado: 0.9705,
  precoAtrSafraAnterior: 1.12,
  refPreco: 'mercado.preco-atr',
  custoOperacionalTonelada: 175.5,
  custoPorKgAtr: 1.2933,
  refCusto: 'mercado.custo-producao',
} as const;

/**
 * Perda invisível: fração fina expelida pelos extratores, que carrega açúcar em
 * concentração comparável à do colmo. Nunca é somada em silêncio à perda
 * visível — a interface a exibe em linha própria e rotulada.
 */
/**
 * Parâmetros do modelo de massa usado pela camada de visão.
 *
 * O modelo principal é superficial: massa = densidade superficial da classe ×
 * área projetada × fator de oclusão. O fator de oclusão compensa a fração do
 * fragmento coberta por palha ou solo, que a câmera não vê.
 */
export const MODELO_MASSA = {
  /**
   * Corrige a parte do fragmento escondida por palha ou solo, que a câmera não
   * vê. O padrão é 1,0 — nenhuma correção — porque aplicar um fator sem tê-lo
   * medido é inventar massa. A oclusão real é uma das grandezas que a pesagem
   * pareada da Fase 2 vai quantificar; até lá, o controle fica exposto na
   * interface e o operador declara o que observou em campo.
   */
  fatorOclusao: 1.0,
  fatorOclusaoIntervalo: [1.0, 1.5] as [number, number],
  /** Incerteza relativa por fragmento, propagada em quadratura no total. */
  incertezaRelativa: 0.25,
  ref: 'hipotese.massa-classe',
} as const;

export const PERDA_INVISIVEL = {
  /** Razão perda invisível / perda visível, valor inicial. HIPÓTESE. */
  razaoSobreVisivel: 1.0,
  razaoIntervalo: [0.8, 1.3] as [number, number],
  /** Fator de ATR da fração fina, comparável ao do colmo. */
  fatorAtr: 0.92,
  ref: 'literatura.perda-invisivel',
} as const;
