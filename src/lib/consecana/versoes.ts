/**
 * Versão do Manual como PARÂMETRO, não como constante.
 *
 * Recomendação explícita da análise meso/macro do projeto: a revisão do
 * CONSECANA-SP formalizada em 16/04/2026 criou um fator adicional garantido de
 * 4,5% ao produtor, que é componente FORA da fórmula de referência e retroativo
 * às safras 2024/25 e 2025/26. Reproduzir apenas a fórmula deixou de reproduzir
 * a remuneração efetiva — por isso a versão é selecionável, e o exemplo da 5ª
 * edição permanece como teste de regressão histórico.
 */

export interface VersaoManual {
  id: string;
  rotulo: string;
  descricao: string;
  /** Componente fora da fórmula de referência (0 = estritamente a fórmula). */
  fatorAdicional: number;
  /** Preço de referência sugerido ao selecionar esta versão (R$/kg de ATR). */
  precoReferencia: number;
  fontePreco: string;
  refPreco: string;
  ref: string;
  safrasRetroativas?: string[];
}

export const VERSOES: VersaoManual[] = [
  {
    id: '5a-edicao',
    rotulo: '5ª edição',
    descricao:
      'Fórmula de referência pura, sem componentes adicionais. É a versão contra a qual ' +
      'o exemplo numérico do Manual é verificado.',
    fatorAdicional: 0,
    precoReferencia: 0.383,
    fontePreco: 'Preço de referência do exemplo do Manual',
    refPreco: 'consecana.exemplo-referencia',
    ref: 'consecana.atr',
  },
  {
    id: 'revisao-2026',
    rotulo: 'Revisão 2026',
    descricao:
      'Acrescenta o fator adicional garantido de 4,5% exclusivo ao produtor, criado pelo ' +
      'MoU UNICA–ORPLANA de 16/04/2026, retroativo às safras 2024/25 e 2025/26.',
    fatorAdicional: 0.045,
    precoReferencia: 0.9705,
    fontePreco: 'Preço médio do ATR projetado para 2026/27 (Pecege/NovaCana)',
    refPreco: 'mercado.preco-atr',
    ref: 'consecana.revisao-2026',
    safrasRetroativas: ['2024/25', '2025/26'],
  },
];

export function versao(id: string): VersaoManual {
  const v = VERSOES.find((x) => x.id === id);
  if (!v) throw new Error(`Versão do Manual desconhecida: ${id}`);
  return v;
}

export const VERSAO_PADRAO = VERSOES[1];
