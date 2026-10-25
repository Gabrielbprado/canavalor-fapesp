# CanaValor — protótipo funcional

Da perda física na colheita mecanizada de cana-de-açúcar à remuneração perdida, sob o modelo CONSECANA-SP.

Protótipo de apresentação para o projeto FAPESP **2026/18131-4** (Fatec Taquaritinga / CEETEPS). Materializa as três camadas da proposta — visão computacional, motor de cálculo e simulação probabilística — mais a auditabilidade normativa.

> **Todos os dados exibidos são sintéticos.** Talhões, imagens e medições foram gerados para esta demonstração e não representam nenhuma usina real. A interface exibe esse aviso de forma permanente. O que é real são as fórmulas do CONSECANA-SP e as referências de mercado citadas.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

Roda inteiramente no navegador, sem backend e **sem qualquer requisição de rede em execução** — inclusive as fontes são auto-hospedadas. Uma vez instalado, funciona offline.

```bash
npm test           # 72 testes
npm run build      # build de produção estático
npx eslint src
```

Para regerar as cenas sintéticas (requer `pillow` e `numpy`):

```bash
python3 scripts/gerar_amostras.py
```

## O que este protótipo demonstra

**O motor reproduz a norma, e isso é verificado a cada execução.** Com PC 14,8044, pureza 87,13 e fibra 12,53, o Manual CONSECANA-SP (5ª edição) manda o motor devolver ATR de 145,99 kg/t e valor de R$ 55,91/t ao preço de referência de R$ 0,3830/kg. O projeto define esse exemplo como teste unitário permanente; ele roda no `npm test` e também na própria interface, à vista de quem assiste.

```
ARC = (3,641 − 0,0343 × Pu) × (1 − 0,01 × F) × (1,0313 − 0,00575 × F)
ATR = 9,5263 × PC + 9,05 × ARC
Valor (R$/t) = ATR × preço do kg de ATR
```

**As cenas são sintéticas por necessidade, não por conveniência.** Não existe base pública de visão computacional para perdas de colheita de cana anotadas por classe — o levantamento cobriu Roboflow Universe, Zenodo, Mendeley Data, IEEE DataPort e GitHub. As fontes mais próximas tratam de qualidade de toletes para plantio (SugarcaneBilletsDataset, MIT, 156 imagens) ou de impureza na esteira da usina (grupos chineses, dados não compartilhados). Construir esse dataset é um dos entregáveis do projeto.

As cinco classes seguem as definições operacionais do CTC (Benedini, Brod & Perticarrari, Boletim CTC, 2009), o que permite validação cruzada contra a pesagem em parcela.

**A validação da visão é real, não encenada.** As cenas sintéticas carregam a massa verdadeira de cada fragmento, gerada por um modelo cilíndrico com densidade e diâmetro sorteados individualmente. O estimador usa densidade superficial sobre a área projetada — modelo deliberadamente diferente. Se fossem o mesmo, o erro tenderia a zero por construção. Erro absoluto médio medido: **14,9%**, contra a meta de 15% do projeto, com contagem de 10/14/23/30 detecções contra 9/14/25/32 fragmentos reais.

Os parâmetros padrão saem de `scripts/calibrar.mjs`, que varre 405 combinações minimizando conjuntamente erro de massa, pior caso e **erro de contagem**. A contagem entra no critério de propósito: existem ajustes com erro de massa menor que chegam lá detectando 67 fragmentos onde há 32 — acertam o total por compensação de erros, contando palha como cana.

**Toda hipótese está marcada como tal.** Os fatores de ATR por classe, as densidades de massa, o mix e as distribuições da simulação não constam de fonte normativa. Cada um aparece na interface com o selo `HIPÓTESE`, `PARÂMETRO` ou `ARBITRADO` e a fase do projeto que o calibra.

**Nenhum texto normativo foi redigido por inferência.** O índice de auditoria transcreve apenas os dispositivos que constam literalmente dos documentos do projeto. Os demais aparecem listados, sem texto, marcados como `a indexar`.

## Estrutura

```
scripts/gerar_amostras.py     gera as cenas sintéticas + ground truth
public/samples/               4 cenas com severidades distintas e a verdade de cada uma

src/lib/                      TypeScript puro, sem React, com testes
  consecana/                  ATR, valor da tonelada, perda → remuneração, versões do Manual
  cv/                         cor, limiarização, morfologia, componentes conexos, forma, massa
  simulacao/                  Monte Carlo determinístico sobre preço e mix
  auditoria/                  índice normativo e trilha de cálculo
  dados/                      talhões sintéticos, com semente fixa

src/app/                      Painel · Visão · Motor · Simulação · Auditoria
src/components/               interface, gráficos em SVG próprio
```

Os módulos de `src/lib` não importam nada de React ou do DOM. São testáveis em Node e reaproveitáveis se a Fase 2 os levar para um CLI ou serviço.

## Sobre a camada de visão

É um **baseline clássico**, deliberadamente: CIELab com limiarização por histerese, morfologia separável, componentes conexos em 8-conectividade, momentos de imagem, retângulo orientado mínimo e classificação geométrica com confiança fuzzy. Nenhuma rede neural.

Não é substituto do detector treinado da Fase 2 — é o que produz o aparato de que ele precisa: calibração de escala, formato de anotação, cálculo de erro de massa e o próprio pipeline de validação.

Limitações conhecidas, todas visíveis na interface:

- Fragmentos encostados formam um componente conexo único. O baseline os marca como *agregado* em vez de adivinhar quantos são.
- O modelo de massa não é calibrado contra balança; o fator de oclusão padrão é 1,0 justamente porque aplicar um fator não medido é inventar massa.
- A validação é sobre imagens sintéticas: demonstra a **metodologia** de validação, não a acurácia em campo.

## Fora do escopo

Treinamento de modelo, ortomosaico e fotogrametria, backend, banco de dados, ingestão real dos boletins CEPEA/ESALQ e indexação vetorial do Manual. São as Fases 2 a 4 do projeto.

## Para a apresentação

Veja [`ROTEIRO.md`](ROTEIRO.md): sequência de cliques, o que dizer em cada tela e as perguntas prováveis da banca com respostas preparadas.
