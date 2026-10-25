# CanaValor — roteiro da demonstração

Processo FAPESP 2026/18131-4 · Fatec Taquaritinga
Duração alvo: **6 a 8 minutos** de demonstração, deixando o resto do tempo para perguntas.

---

## Antes de começar

```bash
cd canavalor
npm run dev          # abre em http://localhost:3000
```

Confira, com o projetor já ligado:

- [ ] A faixa vermelha **DADOS SINTÉTICOS · DEMONSTRAÇÃO** aparece no topo. Ela não sai da tela em nenhum momento.
- [ ] Em `/motor`, a barra do teste de regressão está **verde**.
- [ ] Em `/aquisicao`, a imagem carrega e as caixas coloridas aparecem sobre os fragmentos.
- [ ] Não precisa de internet. Se o Wi-Fi da sala falhar, nada muda.

Se quiser deixar o navegador mais limpo: F11 para tela cheia, e zoom em 90% se a tela for pequena.

---

## A frase de abertura

> "O setor mede a perda de colheita em porcentagem de massa. O produtor é remunerado por quilo de ATR. Enquanto essas duas contas não se encontram, a perda física é um problema agronômico — nunca uma linha no acerto de safra. O CanaValor é a ponte entre as duas."

---

## Passo 1 — Painel `/` · 60 segundos

**O que mostrar:** os quatro cartões do topo e o mapa.

**O que dizer:**
- A unidade tem 512 hectares e perde **R$ 193 mil por safra** só em colheita. Isso é o número que hoje ninguém calcula. Em escala setorial, as medições do CTC apontam ~10% da matéria-prima perdida no campo, com prejuízo estimado em **US$ 450 milhões por ano**.
- O cartão da direita é o que dá urgência: o custo do produtor é **R$ 1,2933 por kg de ATR** contra receita projetada de **R$ 0,9705**. Margem negativa. É nesse aperto que cada quilo no chão pesa.
- Clique no **T-03** (o mais escuro, 6,4%) e depois no **T-01** (o mais claro, 1,4%). A seleção acompanha você pelas três camadas.

**Deixe selecionado o T-07** antes de seguir (ou qualquer um; o roteiro funciona com todos).

---

## Passo 2 — Camada I, visão `/aquisicao` · 2 minutos

**O que mostrar:** a imagem com as detecções, os controles, e o painel de validação.

**O que dizer:**
1. "Esta cena é exatamente uma armação do método manual: 3,33 por 3 metros, os mesmos 10 m² que hoje um técnico lança no solo e pesa à mão."
2. Aponte as caixas coloridas. "Cada fragmento é classificado nas cinco classes do projeto e recebe uma massa estimada."
3. **Passe o mouse sobre uma linha da tabela** — a caixa correspondente acende na imagem. Faça o inverso também.
4. **Mexa no controle "Deslocamento do limiar"** e volte. "O ajuste é em tempo real; o pipeline reprocessa em dezenas de milissegundos."
5. Vá ao painel **Validação contra a verdade da cena**: "Como as cenas são sintéticas, sabemos a massa real de cada fragmento. O erro nesta parcela é de X%, contra a meta de 15% do projeto."

**O ponto mais forte desta tela** — diga com todas as letras:

> "A massa verdadeira foi gerada por um modelo cilíndrico, com densidade e diâmetro sorteados por fragmento. O estimador usa densidade superficial sobre a área projetada. São modelos deliberadamente diferentes — se fossem o mesmo, o erro tenderia a zero por construção e esta validação não significaria nada."

**Se a banca perguntar por que não é deep learning:** veja a seção de perguntas.

---

## Passo 3 — Camada II, motor `/motor` · 2 minutos

**Esta é a tela decisiva. Comece por ela se o tempo encurtar.**

1. Aponte a barra verde no topo: **"Motor conforme o Manual"**.
   > "Com PC 14,8044, pureza 87,13 e fibra 12,53, o Manual manda o motor devolver ATR de 145,99 kg por tonelada e valor de R$ 55,91 por tonelada. É o que está na tela, calculado agora. O projeto define esse exemplo como teste unitário permanente, e ele roda a cada carregamento desta página."

2. Mostre o **cálculo passo a passo** à esquerda. "Cada termo aparece com os números substituídos. Não é uma caixa-preta."

3. Clique em qualquer **§** — por exemplo no "ATR da amostra".
   > "Todo número da interface abre o dispositivo que o fundamenta: a norma, a versão, a fórmula e a transcrição."

4. **Troque a versão do Manual** de "Revisão 2026" para "5ª edição" e volte.
   > "A versão do Manual é parâmetro, não constante. A revisão formalizada em abril de 2026 criou um fator de 4,5% garantido ao produtor, retroativo a duas safras — e que fica **fora** da fórmula de referência. Uma implementação presa à 5ª edição continuaria reproduzindo a fórmula corretamente e, ainda assim, entregando a remuneração errada."

5. Desça até a tabela **Da perda física à remuneração perdida** e **ligue "Incluir a perda invisível estimada"**.
   > "A literatura registra perdas invisíveis de 9,8 a 10,7%, com teor de açúcar comparável ao do colmo. Ela entra em linha própria, marcada como estimada — nunca somada em silêncio à perda medida. E repare que a severidade CTC não muda: ela se mede sobre o visível."

---

## Passo 4 — Camada III, simulação `/simulacao` · 90 segundos

1. Aponte os quatro números do topo: P5, **P50**, P95 e a amplitude.
   > "A saída nunca é um valor pontual. O fornecedor recebe adiantamentos durante a safra e só fecha o valor no acerto anual, conforme o mix realizado e o preço acumulado. Esse descasamento é o que torna a projeção um intervalo."

2. Mostre o histograma. **Passe o mouse** por uma barra.

3. **Mexa no cenário de preço** — troque para "Safra 2025/26" e volte para "2026/27". O intervalo inteiro se desloca.

4. Aponte a **semente** no canto:
   > "Mesma semente, mesmo resultado. Se quiserem, eu rodo de novo agora e sai idêntico. A incerteza aqui é do mercado, não do método."

5. Desça até **Adiantamentos e acerto de safra** e mostre o bloco do fator de 4,5% retroativo.

---

## Passo 5 — Auditoria `/auditoria` · 45 segundos

> "O projeto se compromete a associar cada cálculo ao trecho do Manual que o originou. Este é o índice."

Aponte a divisão da tela:
- **Dispositivos indexados** — têm transcrição verificável.
- **A indexar** — existem no Manual, mas nós ainda não temos a fonte primária.

**Diga isto, é importante:**

> "Nenhum texto normativo foi redigido por inferência. O que não temos aparece como lacuna declarada, sem texto. Numa apresentação a uma agência de fomento, uma citação normativa fabricada custaria mais do que qualquer lacuna admitida. E é exatamente essa lacuna que a Fase 4 fecha, com recuperação em base vetorial sobre o PDF da norma."

---

## Fechamento

> "O que vocês viram são as três camadas da proposta, ligadas de ponta a ponta: da fotografia do talhão até um intervalo de reais por hectare, com cada número rastreável até a norma. É TRL 4 a 5, que é exatamente o alvo declarado do projeto. O que falta é o que o financiamento paga: o dataset de campo anotado, a calibração da massa contra a balança, e o detector treinado."

---

# Perguntas prováveis, com respostas prontas

### "Por que não usaram deep learning? YOLO não seria melhor?"

Seria — e é o que a Fase 2 vai fazer. Mas não existe modelo público treinado para cana inteira, tolete, toco, ponta e lasca; treinar exige o dataset anotado de campo, que é o que o projeto pede recursos para construir. Um YOLO genérico rotularia os fragmentos como "banana" ou "hot dog".

O baseline clássico não é substituto do detector: é o que **produz o aparato** que o detector precisa — a calibração de escala, o formato de anotação, o cálculo de IoU, a métrica de erro de massa e o pipeline de validação. Nada do que está aqui é jogado fora quando o modelo treinado chegar.

### "Já não existe um banco de imagens pronto para isso?"

**Não existe, e essa é uma das justificativas mais fortes do projeto.** Fizemos o levantamento em Roboflow Universe, Zenodo, Mendeley Data, IEEE DataPort e GitHub. O que há são temas adjacentes:

| Fonte | O que é | Por que não serve |
|---|---|---|
| SugarcaneBilletsDataset (MIT) | 156 imagens de toletes | Qualidade de gemas para **plantio**, em laboratório — não perdas no talhão |
| MDSC-DeepLabv3+ (South China Agricultural University, 2023) | Cana, cana quebrada, ponteiro, folha | Impureza na **esteira da usina**; dados **não publicados** |
| YOLOv11n-seg (CATAS, 2026) | 4.974 imagens, 4 classes | Também esteira, não solo; dados **não publicados** |
| RCTUnet | Resíduo de colheita × solo | Outras culturas; útil como método, não como dado |

A metodologia agronômica de classificação **existe e é madura** — é a do CTC, que este protótipo adota — mas todos os estudos brasileiros quantificam por **pesagem manual em parcela**. Nenhum fotografou e anotou essas classes para treinar um modelo.

> "Ou seja: o dataset não é um pré-requisito que deixamos de buscar. Ele é um entregável de pesquisa do projeto, e é parte do que torna a proposta inédita."

Isso também explica por que as cenas desta demonstração são sintéticas — e por que elas vêm com a massa verdadeira de cada fragmento, o que nenhuma foto de campo teria sem a pesagem pareada que a Fase 2 vai fazer.

### "Esses números são reais?"

Não, e a faixa no topo diz isso o tempo todo. Os talhões são sintéticos e as imagens são geradas. **O que é real são as fórmulas e as referências de mercado**: a fórmula do ATR e o exemplo de aceite vêm do Manual CONSECANA-SP; produtividade e ATR médios são da UNICA para o Centro-Sul 2025/26; preço e custo são do Pecege.

### "As classes que vocês usam são as do setor?"

Sim, são as do CTC: cana inteira, tolete, toco, ponta e lasca, com as definições operacionais publicadas por Benedini, Brod e Perticarrari no Boletim CTC de 2009 — cana inteira é o pedaço igual ou maior que dois terços do colmo normal; toco é a base com menos de 20 cm aderida à soqueira. Adotar essa taxonomia não é detalhe: é o que permite validação cruzada direta contra a pesagem em parcela e contra as dezenas de estudos agronômicos que usam o mesmo critério.

### "De onde vieram os fatores de ATR por classe? E as densidades?"

São hipóteses do protótipo, e a interface os marca com o selo `HIPÓTESE` e a fase que os calibra. O próprio projeto declara os fatores por classe como "hipótese parametrizável, calibrável com os dados históricos da usina" — está no texto da proposta. Todos são editáveis na tela; mexa neles à frente da banca se perguntarem.

### "15% de erro não é muito?"

A meta é do próprio projeto e vale para a **média das parcelas**, contra pesagem pareada. A média medida aqui é de 11,7%. Vale notar que o método que estamos substituindo — quatro quadros de 10 m² em talhões de centenas de hectares — tem incerteza amostral que ninguém quantifica.

### "Em uma das parcelas o erro passou de 30%. Por quê?"

Fragmentos encostados formam um único componente conexo, e o baseline geométrico não os separa: nesse caso uma ponta de 79 cm colada num tolete virou uma peça de 112 cm, classificada como cana inteira, com a densidade errada junto. O painel de validação diz isso na tela, não escondemos. A separação por transformada de distância e o detector treinado resolvem esse caso — é trabalho da Fase 2.

### "O sistema funciona com foto de celular?"

O botão **Enviar foto** aceita qualquer imagem. Ele vai pedir a escala, porque sem saber quantos centímetros vale um pixel não existe massa. Na proposta, a aquisição é por drone com ortomosaico georreferenciado mais câmera de solo; a calibração de escala pelos quatro cantos da armação resolve simultaneamente a escala e a perspectiva.

### "E se o CONSECANA mudar de novo?"

É o motivo de a versão ser um seletor e não uma constante. A revisão de 2026 já está implementada como componente separado da fórmula. O exemplo da 5ª edição permanece como teste de regressão histórico — é assim que se sabe que uma mudança nova não quebrou o cálculo antigo.

### "Isso é para a usina ou para o fornecedor?"

Pergunta legítima, e o projeto ainda não fechou. Os dois relatórios saem do mesmo motor: para o fornecedor, é auditoria da remuneração; para a usina, é redução de perda operacional. A decisão muda o discurso comercial, não a arquitetura.

### "Quanto disso já está pronto?"

O motor CONSECANA está validado contra o exemplo do Manual. O pipeline de visão roda de ponta a ponta com validação quantitativa. A simulação é reprodutível. A estrutura de auditoria está pronta e populada com o que é verificável. O que falta é dado de campo — que é o que o auxílio financia.

---

## Se algo der errado ao vivo

| Sintoma | O que fazer |
|---|---|
| A imagem não carrega em `/aquisicao` | Recarregue a página (Ctrl+R). Se persistir, use `/motor`, que não depende de imagem. |
| A barra de regressão está vermelha | Não deveria acontecer — há teste automatizado para isso. Se acontecer, mostre `npx vitest run` num terminal: 72 testes. |
| Tudo travou | `Ctrl+C` no terminal e `npm run dev` de novo. Sobe em menos de um segundo. |
| Perguntaram algo que você não sabe | "Não consta dos documentos que temos; é uma das lacunas que a Fase 1 fecha." É uma resposta melhor do que improvisar — e o protótipo inteiro foi construído com esse critério. |
