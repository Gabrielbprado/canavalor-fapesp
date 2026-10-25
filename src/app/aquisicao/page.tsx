'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { consolidarParcela } from '../../lib/cv/extrapolar';
import { ARMACAO, CLASSES, MODELO_MASSA, PERFIS } from '../../lib/dominio';
import { useEstudo } from '../../components/estado';
import { num, pct } from '../../components/formato';
import { Selo, ValorAuditavel } from '../../components/ValorAuditavel';
import { Alternar, Deslizante, Metrica, Secao, Severidade } from '../../components/ui';
import { Lente, corDe, rotuloDe, type ModoMascara } from '../../components/cv/Lente';
import { usePipeline, type Amostra, type GroundTruth } from '../../components/cv/usePipeline';
import type { ResultadoPipeline } from '../../lib/cv/tipos';
import type { ResultadoParcela } from '../../lib/cv/extrapolar';

const MODOS: { id: ModoMascara; rotulo: string }[] = [
  { id: 'oculta', rotulo: 'Sem máscara' },
  { id: 'preenchida', rotulo: 'Por classe' },
  { id: 'binaria', rotulo: 'Binária' },
];

export default function PaginaAquisicao() {
  const e = useEstudo();
  const { parametrosCv: p, parametrosMassa: pm, talhao } = e;

  const [amostras, setAmostras] = useState<Amostra[]>([]);
  const [modo, setModo] = useState<ModoMascara>('preenchida');
  const [rotulos, setRotulos] = useState(true);
  const [destacado, setDestacado] = useState<number | null>(null);
  const [larguraCena, setLarguraCena] = useState(333);
  const entradaArquivo = useRef<HTMLInputElement>(null);

  const pipeline = usePipeline(p, pm);
  const { fonte, resultado } = pipeline;

  useEffect(() => {
    fetch('/samples/index.json')
      .then((r) => r.json())
      .then((lista: Amostra[]) => {
        setAmostras(lista);
        if (lista[2]) pipeline.carregarAmostra(lista[2]);
      })
      .catch(() => setAmostras([]));
    // Carga única na montagem; o pipeline é estável entre renderizações.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parcela = useMemo(() => {
    if (!resultado || !fonte?.areaM2) return null;
    return consolidarParcela(resultado.deteccoes, fonte.areaM2, talhao.produtividadeTHa);
  }, [resultado, fonte, talhao.produtividadeTHa]);

  // Publica a medição para as demais camadas: é o elo entre a imagem e o motor.
  useEffect(() => {
    e.definirParcela(parcela);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcela]);

  const gt = fonte?.groundTruth ?? null;
  const erroMassa =
    gt && parcela
      ? (Math.abs(parcela.massaTotalKg - gt.real.massa_total_kg) / gt.real.massa_total_kg) * 100
      : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">Camada I</p>
          <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-tinta">
            Quantificação da perda por visão computacional
          </h1>
          <p className="mt-1 max-w-[72ch] text-[0.88rem] leading-relaxed text-tinta-media">
            A cena reproduz uma armação do método manual de referência — quadro de 3,33 × 3,00 m,
            os mesmos 10 m² que hoje um técnico lança no solo e pesa à mão.{' '}
            <ValorAuditavel disp={ARMACAO.ref}>
              <span className="text-tinta-media underline decoration-linha-forte underline-offset-2">
                método da armação
              </span>
            </ValorAuditavel>{' '}
            As cinco classes seguem as definições operacionais do{' '}
            <ValorAuditavel disp="ctc.taxonomia">
              <span className="text-tinta-media underline decoration-linha-forte underline-offset-2">
                CTC
              </span>
            </ValorAuditavel>
            , o que permite validação cruzada contra os estudos agronômicos que usam o mesmo
            critério.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => entradaArquivo.current?.click()}
            className="rounded-sm border border-linha-forte bg-papel-alto px-3.5 py-2 text-[0.82rem] font-medium text-tinta transition-colors hover:border-palha"
          >
            Enviar foto
          </button>
          <input
            ref={entradaArquivo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) pipeline.carregarArquivo(f, null);
              ev.target.value = '';
            }}
          />
        </div>
      </div>

      <AvisoBaseline />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Secao
            numero="1"
            titulo="Parcela em análise"
            descricao={fonte?.rotulo ?? 'Carregando amostra…'}
            acao={
              <div className="flex flex-wrap gap-1.5">
                {MODOS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModo(m.id)}
                    aria-pressed={modo === m.id}
                    className={`dado rounded-sm border px-2 py-1 text-[0.7rem] transition-colors ${
                      modo === m.id
                        ? 'border-palha bg-palha/12 text-tinta'
                        : 'border-linha text-tinta-fraca hover:border-linha-forte'
                    }`}
                  >
                    {m.rotulo}
                  </button>
                ))}
                <button
                  onClick={() => setRotulos((v) => !v)}
                  aria-pressed={rotulos}
                  className={`dado rounded-sm border px-2 py-1 text-[0.7rem] transition-colors ${
                    rotulos
                      ? 'border-palha bg-palha/12 text-tinta'
                      : 'border-linha text-tinta-fraca hover:border-linha-forte'
                  }`}
                >
                  Rótulos
                </button>
              </div>
            }
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              {amostras.map((a) => (
                <button
                  key={a.id}
                  onClick={() => pipeline.carregarAmostra(a)}
                  aria-pressed={gt?.id === a.id}
                  className={`rounded-sm border px-2.5 py-1.5 text-left transition-colors ${
                    gt?.id === a.id
                      ? 'border-palha bg-palha/10'
                      : 'border-linha bg-papel hover:border-linha-forte'
                  }`}
                >
                  <span className="block text-[0.78rem] font-medium text-tinta">{a.rotulo}</span>
                  <span className="dado block text-[0.68rem] text-tinta-fraca">
                    {num(a.perda_pct, 2)}% · {a.fragmentos} frag
                  </span>
                </button>
              ))}
            </div>

            {pipeline.erro && (
              <p className="mb-3 border-l-2 border-perda bg-perda/8 px-3 py-2 text-[0.82rem] text-perda">
                {pipeline.erro}
              </p>
            )}

            {fonte ? (
              fonte.cmPorPx === null ? (
                <CalibrarEscala
                  largura={fonte.imagem.width}
                  larguraCena={larguraCena}
                  definirLarguraCena={setLarguraCena}
                  aplicar={() => pipeline.recalibrar(larguraCena / fonte.imagem.width)}
                />
              ) : (
                <Lente
                  bitmap={fonte.bitmap}
                  resultado={resultado}
                  modoMascara={modo}
                  mostrarRotulos={rotulos}
                  destacado={destacado}
                  aoDestacar={setDestacado}
                  cmPorPxOriginal={fonte.cmPorPx}
                />
              )
            ) : (
              <div className="flex h-72 items-center justify-center rounded-sm border border-dashed border-linha-forte text-[0.85rem] text-tinta-fraca">
                {pipeline.carregando ? 'Carregando…' : 'Nenhuma imagem selecionada'}
              </div>
            )}

            {resultado && fonte?.cmPorPx !== null && (
              <div className="dado mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.7rem] text-tinta-fraca">
                <span>
                  processamento {resultado.larguraProc}×{resultado.alturaProc} ·{' '}
                  {num(resultado.cmPorPxProc, 3)} cm/px
                </span>
                <span>limiar {resultado.limiarUsado}</span>
                <span>
                  {Object.entries(resultado.tempos)
                    .filter(([k]) => k !== 'mapas')
                    .reduce((s, [, v]) => s + v, 0)
                    .toFixed(0)}{' '}
                  ms por ajuste
                </span>
                <span>{resultado.deteccoes.length} detecções</span>
              </div>
            )}
          </Secao>

          {resultado && parcela && <TabelaDeteccoes
            resultado={resultado}
            destacado={destacado}
            aoDestacar={setDestacado}
          />}
        </div>

        <div className="space-y-5">
          {parcela && <ResultadoParcelaPainel parcela={parcela} />}

          {gt && parcela && erroMassa !== null && (
            <PainelValidacao gt={gt} massaEstimada={parcela.massaTotalKg} erro={erroMassa}
              percentualEstimado={parcela.percentual} deteccoes={resultado?.deteccoes.length ?? 0} />
          )}

          <Secao
            numero="2"
            titulo="Parâmetros do pipeline"
            descricao="Ajuste ao vivo. Cada controle refaz a segmentação em dezenas de milissegundos."
            acao={
              <button
                onClick={e.restaurarParametrosCv}
                className="dado rounded-sm border border-linha px-2.5 py-1 text-[0.72rem] text-tinta-media transition-colors hover:border-linha-forte hover:text-tinta"
              >
                restaurar
              </button>
            }
          >
            <div className="space-y-4">
              <Deslizante
                rotulo="Peso da luminância no canal de decisão"
                valor={p.pesoLuminancia}
                aoMudar={(v) => e.definirParametrosCv({ pesoLuminancia: v })}
                min={0.3}
                max={0.8}
                passo={0.05}
              />
              <Deslizante
                rotulo="Deslocamento do limiar"
                valor={p.desvioLimiar}
                aoMudar={(v) => e.definirParametrosCv({ desvioLimiar: v })}
                min={-60}
                max={60}
                passo={1}
                formatar={(v) => (v > 0 ? `+${v}` : String(v))}
              />
              <Deslizante
                rotulo="Faixa da histerese"
                valor={p.fracaoHisterese}
                aoMudar={(v) => e.definirParametrosCv({ fracaoHisterese: v })}
                min={0}
                max={0.9}
                passo={0.05}
              />
              <Deslizante
                rotulo="Raio da abertura"
                valor={p.raioAbertura}
                aoMudar={(v) => e.definirParametrosCv({ raioAbertura: v })}
                min={0}
                max={4}
                passo={1}
                formatar={(v) => `${v} px`}
              />
              <Deslizante
                rotulo="Raio do fechamento"
                valor={p.raioFechamento}
                aoMudar={(v) => e.definirParametrosCv({ raioFechamento: v })}
                min={0}
                max={6}
                passo={1}
                formatar={(v) => `${v} px`}
                aviso={
                  p.raioFechamento > 4
                    ? 'Acima de 4 o fechamento funde fragmentos vizinhos e destrói a contagem por classe.'
                    : undefined
                }
              />
              <Deslizante
                rotulo="Área mínima do componente"
                valor={p.areaMinimaCm2}
                aoMudar={(v) => e.definirParametrosCv({ areaMinimaCm2: v })}
                min={0.5}
                max={12}
                passo={0.5}
                formatar={(v) => `${num(v, 1)} cm²`}
              />
              <div className="space-y-2.5 border-t border-linha pt-3.5">
                <Alternar
                  rotulo="Ramo verde para as pontas"
                  ativo={p.ramoVerde}
                  aoMudar={(v) => e.definirParametrosCv({ ramoVerde: v })}
                  descricao="As pontas têm b* baixo e escapam do canal de decisão; entram pelo a* negativo."
                />
                <Alternar
                  rotulo="Preencher buracos internos"
                  ativo={p.preencherBuracos}
                  aoMudar={(v) => e.definirParametrosCv({ preencherBuracos: v })}
                  descricao="Fecha os vazios deixados por nós e reflexos dentro do colmo."
                />
              </div>
            </div>
          </Secao>

          <Secao
            numero="3"
            titulo="Modelo de massa"
            descricao="Converte área projetada em quilos. É o elo que a calibração de campo vai substituir."
          >
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <Selo tipo="hipotese" fase="Fase 2" />
              <ValorAuditavel disp={MODELO_MASSA.ref}>
                <span className="text-[0.78rem] text-tinta-media">declaração no projeto</span>
              </ValorAuditavel>
            </div>

            <p className="dado mb-4 border-l-2 border-palha bg-papel-fundo/60 px-3 py-2 text-[0.76rem] leading-relaxed text-tinta">
              massa = densidade da classe × área projetada × fator de oclusão
            </p>

            <Deslizante
              rotulo="Fator de oclusão"
              valor={pm.fatorOclusao}
              aoMudar={(v) => e.definirParametrosMassa({ fatorOclusao: v })}
              min={1}
              max={1.5}
              passo={0.01}
              formatar={(v) => `${num(v, 2)}×`}
            />
            <p className="mt-1.5 text-[0.74rem] leading-relaxed text-tinta-fraca">
              Compensa a parte do fragmento coberta por palha ou solo. O padrão é 1,00 — sem
              correção — porque aplicar um fator não medido é inventar massa.
            </p>

            <div className="mt-4 space-y-2.5 border-t border-linha pt-3.5">
              {CLASSES.map((c) => (
                <div key={c} className="flex items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: PERFIS[c].cor }}
                    aria-hidden
                  />
                  <span className="w-[6.2rem] shrink-0 text-[0.8rem] text-tinta">
                    {PERFIS[c].rotulo}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Deslizante
                      rotulo="densidade"
                      valor={pm.densidades[c]}
                      aoMudar={(v) =>
                        e.definirParametrosMassa({
                          densidades: { ...pm.densidades, [c]: v },
                        })
                      }
                      min={0.0005}
                      max={0.008}
                      passo={0.0001}
                      formatar={(v) => `${num(v * 1000, 2)} g/cm²`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Secao>
        </div>
      </div>
    </div>
  );
}

function AvisoBaseline() {
  return (
    <div className="cartao border-l-[3px] border-l-solo px-5 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-[0.88rem] font-semibold text-tinta">
          Este é o baseline clássico, não o detector treinado
        </p>
        <Selo tipo="arbitrado" />
      </div>
      <p className="mt-1.5 max-w-[95ch] text-[0.82rem] leading-relaxed text-tinta-media">
        A segmentação é geométrica: separação em CIELab por histerese, morfologia, componentes
        conexos e classificação por forma. Nenhuma rede neural. Ela estabelece o piso de
        desempenho e, sobretudo, produz o aparato de escala, anotação e validação que a Fase 2
        reaproveita integralmente para treinar e avaliar o detector com imagens reais de campo —
        nada do que está aqui é descartado quando o modelo treinado chegar.
      </p>
    </div>
  );
}

function CalibrarEscala({
  largura,
  larguraCena,
  definirLarguraCena,
  aplicar,
}: {
  largura: number;
  larguraCena: number;
  definirLarguraCena: (v: number) => void;
  aplicar: () => void;
}) {
  return (
    <div className="rounded-sm border border-dashed border-linha-forte bg-papel-fundo/40 px-5 py-6">
      <p className="rotulo !text-perda">Escala não calibrada</p>
      <p className="mt-2 max-w-[60ch] text-[0.85rem] leading-relaxed text-tinta-media">
        Sem escala não há massa: toda medida em quilos depende de saber quantos centímetros vale
        um pixel. Informe a largura real da cena fotografada.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label>
          <span className="rotulo">Largura real da cena</span>
          <span className="mt-1 flex items-baseline gap-2">
            <input
              type="number"
              value={larguraCena}
              min={20}
              max={2000}
              step={1}
              onChange={(ev) => definirLarguraCena(Number(ev.target.value))}
              className="dado w-28 border-b border-linha-forte bg-transparent pb-1 text-[1.05rem] text-tinta outline-none focus:border-palha"
            />
            <span className="text-[0.75rem] text-tinta-fraca">cm</span>
          </span>
        </label>
        <button
          onClick={aplicar}
          className="rounded-sm border border-palha bg-palha/12 px-3.5 py-2 text-[0.82rem] font-medium text-tinta transition-colors hover:bg-palha/20"
        >
          Aplicar escala
        </button>
        <p className="dado text-[0.72rem] text-tinta-fraca">
          resulta em {num(larguraCena / largura, 4)} cm por pixel
        </p>
      </div>
    </div>
  );
}

function ResultadoParcelaPainel({ parcela }: { parcela: ResultadoParcela }) {
  return (
    <Secao
      titulo="Perda medida na parcela"
      descricao={`Extrapolada da amostra de ${num(parcela.areaAmostraM2, 2)} m² para o hectare.`}
    >
      <div className="grid grid-cols-2 gap-4">
        <Metrica
          rotulo="Massa na parcela"
          valor={num(parcela.massaTotalKg, 3)}
          unidade="kg"
          detalhe={`intervalo ${num(parcela.massaMinKg, 2)}–${num(parcela.massaMaxKg, 2)} kg`}
        />
        <Metrica
          rotulo="Perda extrapolada"
          valor={num(parcela.perdaKgHa, 0)}
          unidade="kg/ha"
          tamanho="medio"
        />
      </div>
      <div className="mt-4 border-t border-linha pt-3.5">
        <Severidade severidade={parcela.severidade} percentual={parcela.percentual} />
      </div>

      <table className="mt-4 w-full text-[0.8rem]">
        <thead>
          <tr className="border-b border-linha-forte text-left">
            <th className="rotulo pb-1.5 font-normal">Classe</th>
            <th className="rotulo pb-1.5 text-right font-normal">n</th>
            <th className="rotulo pb-1.5 text-right font-normal">kg</th>
            <th className="rotulo pb-1.5 text-right font-normal">kg/ha</th>
          </tr>
        </thead>
        <tbody>
          {CLASSES.map((c) => (
            <tr key={c} className="border-b border-linha/60">
              <td className="py-1.5">
                <span className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: PERFIS[c].cor }}
                    aria-hidden
                  />
                  <span className="text-tinta">{PERFIS[c].rotulo}</span>
                </span>
              </td>
              <td className="dado py-1.5 text-right text-tinta-media">
                {parcela.porClasse[c].contagem}
              </td>
              <td className="dado py-1.5 text-right text-tinta-media">
                {num(parcela.porClasse[c].massaKg, 3)}
              </td>
              <td className="dado py-1.5 text-right font-medium text-tinta">
                {num(parcela.porClasse[c].kgHa, 0)}
              </td>
            </tr>
          ))}
          {parcela.agregados > 0 && (
            <tr className="border-b border-linha/60 bg-papel-fundo/50">
              <td className="py-1.5 italic text-tinta-media">Agregados</td>
              <td className="dado py-1.5 text-right text-tinta-media">{parcela.agregados}</td>
              <td className="dado py-1.5 text-right text-tinta-fraca" colSpan={2}>
                contagem indeterminada
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {parcela.agregados > 0 && (
        <p className="mt-2 text-[0.74rem] leading-snug text-tinta-fraca">
          Fragmentos encostados formam um único componente conexo. O baseline os marca como
          agregado em vez de adivinhar quantos são — a separação por transformada de distância
          fica para a Fase 2.
        </p>
      )}
    </Secao>
  );
}

function PainelValidacao({
  gt,
  massaEstimada,
  erro,
  percentualEstimado,
  deteccoes,
}: {
  gt: GroundTruth;
  massaEstimada: number;
  erro: number;
  percentualEstimado: number;
  deteccoes: number;
}) {
  const dentro = erro <= 15;
  const faltando = gt.real.contagem_total - deteccoes;
  return (
    <Secao
      titulo="Validação contra a verdade da cena"
      descricao="As cenas sintéticas carregam a massa real de cada fragmento, o que permite medir o erro em vez de estimá-lo."
    >
      <div
        className={`mb-4 border-l-[3px] px-3 py-2 ${
          dentro ? 'border-l-baixo bg-baixo/8' : 'border-l-alto bg-alto/8'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`dado flex size-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold ${
              dentro ? 'bg-baixo/20 text-baixo' : 'bg-alto/20 text-alto'
            }`}
            aria-hidden
          >
            {dentro ? '✓' : '!'}
          </span>
          <p className="text-[0.84rem] text-tinta">
            Erro de massa <strong className="dado">{num(erro, 1)}%</strong> · meta do projeto ≤ 15%
          </p>
        </div>
        {/* Quando a parcela estoura a meta, a causa aparece aqui. Uma validação
            que só mostra o número quando ele é bom não é validação. */}
        {!dentro && (
          <p className="mt-2 text-[0.78rem] leading-relaxed text-tinta-media">
            {faltando > 0
              ? `Faltam ${faltando} de ${gt.real.contagem_total} fragmentos. A causa típica é fragmentos encostados: eles formam um único componente conexo, e o baseline geométrico não os separa — o comprimento somado empurra a peça para a classe errada, com a densidade errada junto. Separá-los por transformada de distância, ou detectá-los com o modelo treinado, é trabalho da Fase 2.`
              : 'A contagem está correta, então o desvio vem do modelo de massa e não da segmentação — é exatamente o coeficiente que a pesagem pareada da Fase 2 vai calibrar.'}
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[0.82rem]">
        <div>
          <dt className="rotulo">Massa real</dt>
          <dd className="dado mt-0.5 text-tinta">{num(gt.real.massa_total_kg, 3)} kg</dd>
        </div>
        <div>
          <dt className="rotulo">Massa estimada</dt>
          <dd className="dado mt-0.5 text-tinta">{num(massaEstimada, 3)} kg</dd>
        </div>
        <div>
          <dt className="rotulo">Fragmentos reais</dt>
          <dd className="dado mt-0.5 text-tinta">{gt.real.contagem_total}</dd>
        </div>
        <div>
          <dt className="rotulo">Detectados</dt>
          <dd className="dado mt-0.5 text-tinta">{deteccoes}</dd>
        </div>
        <div>
          <dt className="rotulo">Perda real</dt>
          <dd className="dado mt-0.5 text-tinta">{pct(gt.real.perda_pct_efetiva)}</dd>
        </div>
        <div>
          <dt className="rotulo">Perda estimada</dt>
          <dd className="dado mt-0.5 text-tinta">{pct(percentualEstimado)}</dd>
        </div>
      </dl>

      <p className="mt-4 border-t border-linha pt-3 text-[0.75rem] leading-relaxed text-tinta-fraca">
        Estas cenas são sintéticas porque{' '}
        <ValorAuditavel disp="estado-da-arte.ausencia-dataset">
          <span className="text-tinta-media">não existe base pública</span>
        </ValorAuditavel>{' '}
        de perdas de colheita de cana anotadas por classe — construí-la é justamente um dos
        entregáveis do projeto. A massa verdadeira foi gerada por{' '}
        <span className="dado text-tinta-media">{gt.modelo_verdade.formula}</span>, com densidade e
        diâmetro sorteados por fragmento. É deliberadamente um modelo diferente do que o estimador
        usa: se ambos fossem o mesmo, o erro tenderia a zero por construção e esta validação não
        significaria nada.
      </p>
    </Secao>
  );
}

function TabelaDeteccoes({
  resultado,
  destacado,
  aoDestacar,
}: {
  resultado: ResultadoPipeline;
  destacado: number | null;
  aoDestacar: (id: number | null) => void;
}) {
  const ordenadas = useMemo(
    () => [...resultado.deteccoes].sort((a, b) => b.massaKg - a.massaKg),
    [resultado.deteccoes],
  );

  return (
    <Secao
      titulo="Fragmentos detectados"
      descricao="Passe o cursor sobre uma linha ou sobre a imagem: o destaque é sincronizado nos dois sentidos."
    >
      <div className="max-h-[26rem] overflow-y-auto">
        <table className="w-full text-[0.8rem]">
          <thead className="sticky top-0 bg-papel-alto">
            <tr className="border-b border-linha-forte text-left">
              <th className="rotulo pb-1.5 font-normal">Classe</th>
              <th className="rotulo pb-1.5 text-right font-normal">conf.</th>
              <th className="rotulo pb-1.5 text-right font-normal">compr.</th>
              <th className="rotulo pb-1.5 text-right font-normal">larg.</th>
              <th className="rotulo pb-1.5 text-right font-normal">área</th>
              <th className="rotulo pb-1.5 text-right font-normal">massa</th>
              <th className="rotulo pb-1.5 text-center font-normal">medida</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((d) => (
              <tr
                key={d.id}
                onMouseEnter={() => aoDestacar(d.id)}
                onMouseLeave={() => aoDestacar(null)}
                className={`cursor-default border-b border-linha/50 transition-colors ${
                  destacado === d.id ? 'bg-palha/14' : 'hover:bg-papel-fundo/60'
                }`}
              >
                <td className="py-1.5">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: corDe(d.classe) }}
                      aria-hidden
                    />
                    <span className="text-tinta">{rotuloDe(d.classe)}</span>
                    {d.ambiguo && (
                      <span
                        className="dado text-[0.62rem] uppercase tracking-wider text-solo"
                        title="A árvore de decisão e os perfis de forma discordaram nesta detecção"
                      >
                        ambíguo
                      </span>
                    )}
                  </span>
                </td>
                <td className="dado py-1.5 text-right text-tinta-media">
                  {num(d.confianca, 2)}
                </td>
                <td className="dado py-1.5 text-right text-tinta-media">
                  {num(d.comprimentoCm, 1)}
                </td>
                <td className="dado py-1.5 text-right text-tinta-media">
                  {num(d.larguraCm, 2)}
                </td>
                <td className="dado py-1.5 text-right text-tinta-media">{num(d.areaCm2, 0)}</td>
                <td className="dado py-1.5 text-right font-medium text-tinta">
                  {num(d.massaKg, 3)}
                </td>
                <td
                  className="dado py-1.5 text-center text-[0.68rem] text-tinta-fraca"
                  title={
                    d.origemComprimento === 'fibra'
                      ? 'Fragmento curvo: o comprimento veio do modelo de fibra, que recupera o eixo real'
                      : 'Comprimento medido pelo retângulo orientado mínimo'
                  }
                >
                  {d.origemComprimento === 'fibra' ? 'fibra' : 'obb'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 text-[0.73rem] leading-snug text-tinta-fraca">
        Unidades: comprimento e largura em cm, área em cm², massa em kg. A coluna{' '}
        <span className="dado">medida</span> declara como o comprimento foi obtido — o retângulo
        mínimo subestima colmos curvos, e nesses casos o modelo de fibra assume.
      </p>
    </Secao>
  );
}
