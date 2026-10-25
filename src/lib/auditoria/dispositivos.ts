/**
 * Índice normativo do CanaValor.
 *
 * Cada número exibido na interface carrega a referência ao dispositivo que o
 * fundamenta. Esta é a versão local e estática do índice que, na Fase 4 do
 * projeto, será substituído por recuperação em base vetorial (RAG).
 *
 * REGRA DE INTEGRIDADE: nenhum texto normativo é redigido aqui por inferência.
 * Só entra como `verificado` o que consta literalmente dos documentos do
 * projeto. O que ainda não temos entra como `a-indexar`, com o texto ausente.
 */

export type StatusDispositivo = 'verificado' | 'a-indexar';

export interface Dispositivo {
  id: string;
  norma: string;
  versao: string;
  dispositivo: string;
  /** Transcrição literal. `null` quando a fonte primária ainda não foi indexada. */
  texto: string | null;
  formula?: string;
  fonte: string;
  status: StatusDispositivo;
}

export const DISPOSITIVOS: Record<string, Dispositivo> = {
  'consecana.atr': {
    id: 'consecana.atr',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Fórmula do Açúcar Total Recuperável (ATR)',
    texto:
      'O ATR, em quilogramas por tonelada, é dado por ATR = 9,5263 x PC + 9,05 x ARC, ' +
      'em que PC é a pol da cana, e ARC = (3,641 - 0,0343 x Pu) x (1 - 0,01 x F) x ' +
      '(1,0313 - 0,00575 x F), em que Pu é a pureza do caldo e F o teor de fibra; os ' +
      'coeficientes incorporam o fator de 9,5 por cento de perdas industriais previsto ' +
      'na metodologia.',
    formula: 'ATR = 9,5263 × PC + 9,05 × ARC',
    fonte: 'Projeto CanaValor, seção "Potencial de Inovação e Metodologia", Fase 1',
    status: 'verificado',
  },
  'consecana.arc': {
    id: 'consecana.arc',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Açúcares Redutores da Cana (ARC)',
    texto:
      'ARC = (3,641 - 0,0343 x Pu) x (1 - 0,01 x F) x (1,0313 - 0,00575 x F), em que ' +
      'Pu é a pureza do caldo e F o teor de fibra.',
    formula: 'ARC = (3,641 − 0,0343 × Pu) × (1 − 0,01 × F) × (1,0313 − 0,00575 × F)',
    fonte: 'Projeto CanaValor, seção "Potencial de Inovação e Metodologia", Fase 1',
    status: 'verificado',
  },
  'consecana.perdas-industriais': {
    id: 'consecana.perdas-industriais',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Fator de perdas industriais',
    texto:
      'Os coeficientes incorporam o fator de 9,5 por cento de perdas industriais ' +
      'previsto na metodologia.',
    fonte: 'Projeto CanaValor, seção "Potencial de Inovação e Metodologia", Fase 1',
    status: 'verificado',
  },
  'consecana.exemplo-referencia': {
    id: 'consecana.exemplo-referencia',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Exemplo numérico de referência (critério de aceite do motor)',
    texto:
      'Para PC de 14,8044, pureza de 87,13 e fibra de 12,53, o motor deve retornar ATR ' +
      'de aproximadamente 145,99 quilogramas por tonelada e, ao preço de referência de ' +
      'R$ 0,3830 por quilograma, valor da tonelada de aproximadamente R$ 55,91, ' +
      'operando em produção com o preço corrente.',
    fonte: 'Projeto CanaValor — definido como teste unitário permanente do sistema',
    status: 'verificado',
  },
  'consecana.valor-tonelada': {
    id: 'consecana.valor-tonelada',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Valor da tonelada de cana',
    texto:
      'Decorre do exemplo de referência: 145,99 kg ATR/t × R$ 0,3830/kg = R$ 55,91/t. ' +
      'O dispositivo literal do Manual que enuncia a multiplicação ainda não foi indexado.',
    formula: 'Valor (R$/t) = ATR (kg/t) × preço do kg de ATR (R$/kg)',
    fonte: 'Derivado do exemplo de referência do Manual',
    status: 'verificado',
  },
  'consecana.revisao-2026': {
    id: 'consecana.revisao-2026',
    norma: 'MoU UNICA–ORPLANA (Cana Summit 2026)',
    versao: 'Revisão de 16/04/2026',
    dispositivo: 'Fator adicional garantido ao produtor',
    texto:
      'Revisão do CONSECANA-SP formalizada em 16/04/2026 cria fator adicional garantido ' +
      'de 4,5% exclusivo ao produtor, retroativo às safras 2024/25 e 2025/26, com ' +
      'auditoria externa da apuração do preço do ATR e revisão dos critérios a cada 5 ' +
      'anos. Trata-se de componente adicional FORA da fórmula de referência.',
    formula: 'Valor ajustado = Valor CONSECANA × (1 + 0,045)',
    fonte: 'CanaValor — Análise Meso/Macro, Ameaça A1 e Oportunidade O1',
    status: 'verificado',
  },
  'metodo.armacao': {
    id: 'metodo.armacao',
    norma: 'Método da armação (medição manual de referência)',
    versao: 'Gecom/Fatec "Shunji Nishimura"',
    dispositivo: 'Procedimento amostral de campo',
    texto:
      'Quadro de 10 m² (3,33 × 3 m), 4 repetições em pontos aleatórios, classes toco / ' +
      'cana ponta / cana inteira / colmo / lasca.',
    fonte: 'Cultivar Máquinas nº 172, 2020',
    status: 'verificado',
  },
  'ctc.severidade': {
    id: 'ctc.severidade',
    norma: 'Classificação CTC de severidade de perda',
    versao: '—',
    dispositivo: 'Faixas de severidade',
    texto: 'Baixo 0–2,5%; médio 2,5–4,5%; alto acima de 4,5%.',
    fonte: 'Gecom/Fatec "Shunji Nishimura", Cultivar Máquinas nº 172, 2020',
    status: 'verificado',
  },
  'literatura.perda-visivel': {
    id: 'literatura.perda-visivel',
    norma: 'Literatura técnica',
    versao: 'CNPEM/CTBE, 05/12/2017',
    dispositivo: 'Magnitude da perda na colheita mecanizada',
    texto:
      'A colheita mecanizada perde entre 5 e 10 por cento da cana. Estudo sobre 6,8 de ' +
      '9 Mha colhidos mecanicamente aponta 10% de perda real contra os 5% visíveis que ' +
      'o setor efetivamente contabiliza, equivalentes a 50 milhões de toneladas e ' +
      'R$ 4,5 bilhões por safra.',
    fonte: 'CNPEM/CTBE',
    status: 'verificado',
  },
  'literatura.perda-invisivel': {
    id: 'literatura.perda-invisivel',
    norma: 'Literatura técnica',
    versao: 'Neves et al., 2006, Engenharia Agrícola',
    dispositivo: 'Perdas invisíveis e seu teor de açúcar',
    texto:
      'Perdas invisíveis de 9,8% a 10,7%, com 13,0% a 13,9% de pol. O material fino ' +
      'expelido pelos extratores carrega açúcar em concentração comparável à do colmo; ' +
      'medir só o visível subestima sistematicamente a perda de ATR.',
    fonte: 'Neves et al. (2006), Engenharia Agrícola',
    status: 'verificado',
  },
  'mercado.unica-2025-26': {
    id: 'mercado.unica-2025-26',
    norma: 'Indicadores setoriais',
    versao: 'UNICA, safra 2025/26 Centro-Sul',
    dispositivo: 'Produtividade e qualidade médias',
    texto:
      'Produtividade agrícola de 74,4 t/ha (−4,1%); ATR médio de 137,79 kg/t (−2,34%); ' +
      'moagem de 611,15 Mt; 226 unidades produtoras, 209 processando cana.',
    fonte: 'UNICA',
    status: 'verificado',
  },
  'mercado.preco-atr': {
    id: 'mercado.preco-atr',
    norma: 'Indicadores setoriais',
    versao: 'Pecege/NovaCana, 14/05/2026',
    dispositivo: 'Preço do ATR projetado',
    texto:
      'Preço médio do ATR projetado para 2026/27 em R$ 0,9705/kg, abaixo de R$ 1,00. ' +
      'ATR CONSECANA-SP projetado para 2025/26 em cerca de R$ 1,12/kg, com viés de baixa.',
    fonte: 'Pecege / NovaCana / Cana Online',
    status: 'verificado',
  },
  'mercado.custo-producao': {
    id: 'mercado.custo-producao',
    norma: 'Indicadores setoriais',
    versao: 'Pecege, 02/03/2026',
    dispositivo: 'Custo operacional do produtor',
    texto:
      'Custo operacional da cana no Centro-Sul em 2025/26: R$ 175,50/t, equivalente a ' +
      'R$ 1,2933 por kg de ATR. Composição: operações 52%, insumos 25%, arrendamento ' +
      '17%, outros 6%.',
    fonte: 'Pecege',
    status: 'verificado',
  },
  'consecana.acerto-retroativo': {
    id: 'consecana.acerto-retroativo',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Adiantamentos e acerto anual de safra',
    texto:
      'O fornecedor entrega a cana e recebe adiantamentos ao longo da safra, com o valor ' +
      'definitivo fechado somente no acerto anual, conforme o mix realizado e o preço ' +
      'acumulado do quilograma de ATR divulgado nos boletins CEPEA/ESALQ.',
    fonte: 'Projeto CanaValor, seção de contextualização',
    status: 'verificado',
  },

  'ctc.taxonomia': {
    id: 'ctc.taxonomia',
    norma: 'Metodologia CTC de avaliação de perdas',
    versao: 'Benedini, Brod & Perticarrari (2009)',
    dispositivo: 'Classificação das perdas vegetais na colheita mecanizada',
    texto:
      'O Centro de Tecnologia Canavieira classifica as perdas vegetais em tolete, ' +
      'toco, pedaço, cana inteira, lasca, ponteiro e estilhaço, com coleta em ' +
      'parcela de aproximadamente 10 m² (3,3 × 3,0 m, duas linhas). Cana inteira é ' +
      'definida como pedaço de cana igual ou maior que dois terços do tamanho ' +
      'normal da cana; toco é a base com menos de 20 cm aderida à soqueira.',
    fonte:
      'Benedini, Brod & Perticarrari, "Perdas de cana e impurezas vegetais e ' +
      'minerais na colheita mecanizada", Boletim CTC, Guariba, 2009',
    status: 'verificado',
  },
  'literatura.impacto-economico': {
    id: 'literatura.impacto-economico',
    norma: 'Literatura técnica',
    versao: 'Magalhães et al. (2006), Engenharia Agrícola',
    dispositivo: 'Impacto econômico das perdas na colheita mecanizada',
    texto:
      'Prejuízo estimado da ordem de US$ 450 milhões por ano no setor, decorrente ' +
      'das perdas de matéria-prima na colheita mecanizada. Medições do CTC indicam ' +
      'que cerca de 10% da matéria-prima colhida é perdida no campo no corte ' +
      'mecanizado.',
    fonte: 'Magalhães et al. (2006), Engenharia Agrícola (SciELO); Centro de Tecnologia Canavieira',
    status: 'verificado',
  },
  'estado-da-arte.ausencia-dataset': {
    id: 'estado-da-arte.ausencia-dataset',
    norma: 'Estado da arte — levantamento de bases públicas',
    versao: 'Levantamento de 2026',
    dispositivo: 'Inexistência de dataset público para perdas de colheita por classe',
    texto:
      'Não existe base pública de visão computacional para perdas na colheita ' +
      'mecanizada de cana classificadas por cana inteira, tolete, toco, ponta e ' +
      'lasca. As fontes mais próximas tratam de temas adjacentes: qualidade de ' +
      'toletes para plantio (SugarcaneBilletsDataset, MIT, 156 imagens), impurezas ' +
      'de cana na esteira da usina (grupos chineses, dados não compartilhados) e ' +
      'segmentação de resíduo de colheita no solo em outras culturas (RCTUnet). A ' +
      'metodologia de classes está consolidada na literatura agronômica brasileira, ' +
      'mas sempre quantificada por pesagem manual em parcelas — nenhum trabalho ' +
      'fotografou e anotou essas classes para treino de modelos de detecção.',
    fonte:
      'Levantamento de bases públicas (Roboflow Universe, Zenodo, Mendeley Data, ' +
      'IEEE DataPort, GitHub); survey de Lu & Young (2020), Computers and ' +
      'Electronics in Agriculture 178:105760',
    status: 'verificado',
  },
  'prototipo.cenas-sinteticas': {
    id: 'prototipo.cenas-sinteticas',
    norma: 'Decisão de engenharia do protótipo',
    versao: 'Esta demonstração',
    dispositivo: 'Origem das imagens de demonstração',
    texto:
      'As cenas são geradas proceduralmente porque não existe base pública para ' +
      'este problema. Cada uma reproduz a geometria de uma armação de 10 m² e vem ' +
      'acompanhada da massa verdadeira de cada fragmento, calculada por um modelo ' +
      'cilíndrico com densidade e diâmetro sorteados individualmente — modelo ' +
      'deliberadamente distinto do estimador, que usa densidade superficial sobre a ' +
      'área projetada. Sem essa separação, o erro medido tenderia a zero por ' +
      'construção e a validação não significaria nada.',
    fonte: 'scripts/gerar_amostras.py',
    status: 'verificado',
  },

  // ---------------------------------------------------------------------------
  // Dispositivos cuja fonte primária ainda NÃO está disponível.
  // Aparecem na interface como "TRECHO A INDEXAR". Não têm texto por decisão
  // deliberada: redigi-los por inferência seria fabricar citação normativa.
  // ---------------------------------------------------------------------------
  'consecana.pc-laboratorio': {
    id: 'consecana.pc-laboratorio',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Determinação da pol da cana (PC) a partir de Brix, Pol do caldo e fibra',
    texto: null,
    fonte: 'Manual CONSECANA-SP — PDF ainda não indexado',
    status: 'a-indexar',
  },
  'consecana.atr-relativo': {
    id: 'consecana.atr-relativo',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'ATR relativo e ATR acumulado da safra',
    texto: null,
    fonte: 'Manual CONSECANA-SP — PDF ainda não indexado',
    status: 'a-indexar',
  },
  'consecana.mix': {
    id: 'consecana.mix',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Composição da cesta de produtos e apuração do mix açúcar/etanol',
    texto: null,
    fonte: 'Manual CONSECANA-SP — PDF ainda não indexado',
    status: 'a-indexar',
  },
  'consecana.modalidades': {
    id: 'consecana.modalidades',
    norma: 'Manual de Instruções CONSECANA-SP',
    versao: '5ª edição',
    dispositivo: 'Modalidades contratuais de fornecimento',
    texto: null,
    fonte: 'Manual CONSECANA-SP — PDF ainda não indexado',
    status: 'a-indexar',
  },
  'hipotese.fator-atr-classe': {
    id: 'hipotese.fator-atr-classe',
    norma: 'Hipótese do projeto CanaValor',
    versao: 'A calibrar na Fase 3',
    dispositivo: 'Fator de ATR diferenciado por classe de perda',
    texto:
      'O projeto declara: "atribuindo à cana perdida o ATR de referência do próprio ' +
      'talhão com fatores por classe declarados como hipótese parametrizável, ' +
      'calibrável com os dados históricos da usina". Os valores usados aqui são ' +
      'iniciais e não constam de nenhuma fonte normativa.',
    fonte: 'Projeto CanaValor, Fase 3 — valores iniciais arbitrados no protótipo',
    status: 'verificado',
  },
  'hipotese.massa-classe': {
    id: 'hipotese.massa-classe',
    norma: 'Hipótese do projeto CanaValor',
    versao: 'A calibrar na Fase 2',
    dispositivo: 'Conversão de imagem em massa por densidade por classe',
    texto:
      'O projeto prevê "conversão de imagem em massa por densidade por classe, ' +
      'calibrada contra pesagem pareada" na Fase 2. As densidades usadas aqui são ' +
      'iniciais e serão substituídas pela calibração de campo.',
    fonte: 'Projeto CanaValor, Fase 2 — valores iniciais arbitrados no protótipo',
    status: 'verificado',
  },
};

export function dispositivo(id: string): Dispositivo {
  const d = DISPOSITIVOS[id];
  if (!d) throw new Error(`Dispositivo normativo desconhecido: ${id}`);
  return d;
}

export function listarDispositivos(): Dispositivo[] {
  return Object.values(DISPOSITIVOS);
}
