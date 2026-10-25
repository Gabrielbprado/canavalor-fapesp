'use client';

import { useMemo } from 'react';
import { calcularATR, calcularValorTonelada } from '../../lib/consecana/atr';
import { calcularPerdas } from '../../lib/consecana/perdas';
import { EXEMPLO_MANUAL, rodarRegressaoManual } from '../../lib/consecana/regressao';
import { VERSOES } from '../../lib/consecana/versoes';
import { CLASSES, type ClassePerda, PERDA_INVISIVEL, PERFIS } from '../../lib/dominio';
import { TALHOES } from '../../lib/dados/talhoes';
import { useEstudo } from '../../components/estado';
import { brl, num, pct } from '../../components/formato';
import { Selo, ValorAuditavel } from '../../components/ValorAuditavel';
import { Alternar, Campo, Deslizante, Metrica, Secao, Severidade } from '../../components/ui';
import { Cascata } from '../../components/charts/Cascata';

export default function PaginaMotor() {
  const e = useEstudo();
  const {
    talhao,
    laboratorio,
    versao,
    precoKgAtr,
    fatoresAtr,
    incluirInvisivel,
    razaoInvisivel,
    parcela,
    usarMedicao,
  } = e;

  const atr = useMemo(() => calcularATR(laboratorio), [laboratorio]);
  const valorTonelada = useMemo(
    () => calcularValorTonelada(atr.valor, precoKgAtr, versao.fatorAdicional),
    [atr.valor, precoKgAtr, versao.fatorAdicional],
  );
  const regressao = useMemo(() => rodarRegressaoManual(), []);

  // A perda pode vir da medição por imagem ou do histórico do talhão. A origem
  // fica declarada na tela: são dois números diferentes, e confundi-los seria
  // exatamente o tipo de erro que este projeto existe para evitar.
  const perdaPorClasse = useMemo<Record<ClassePerda, number>>(() => {
    if (usarMedicao && parcela) {
      return Object.fromEntries(
        CLASSES.map((c) => [c, parcela.porClasse[c].kgHa]),
      ) as Record<ClassePerda, number>;
    }
    return talhao.perdaPorClasseKgHa;
  }, [usarMedicao, parcela, talhao]);

  const perdas = useMemo(
    () =>
      calcularPerdas({
        perdaPorClasseKgHa: perdaPorClasse,
        atrTalhaoKgT: talhao.atrKgT,
        produtividadeTHa: talhao.produtividadeTHa,
        precoKgAtr,
        fatorAdicional: versao.fatorAdicional,
        fatoresAtr,
        incluirInvisivel,
        razaoInvisivel,
      }),
    [
      perdaPorClasse,
      talhao,
      precoKgAtr,
      versao.fatorAdicional,
      fatoresAtr,
      incluirInvisivel,
      razaoInvisivel,
    ],
  );

  const perdaNoTalhao = perdas.reaisPorHaTotal * talhao.areaHa;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo">Camada II</p>
          <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-tinta">
            Motor de cálculo CONSECANA-SP
          </h1>
          <p className="mt-1 max-w-[70ch] text-[0.88rem] leading-relaxed text-tinta-media">
            Reproduz as fórmulas oficiais do Manual e converte a perda física em quilos de ATR e
            em reais por hectare. Todo valor marcado abre o dispositivo que o fundamenta.
          </p>
        </div>
        <SeletorTalhao />
      </div>

      {/* O teste de regressão abre a tela por decisão: enquanto estiver verde, o
          motor reproduz a norma. É a afirmação mais forte que este protótipo
          pode fazer, e ela é executada ao vivo, não prometida. */}
      <PainelRegressao regressao={regressao} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Secao
          numero="1"
          titulo="Análise de laboratório"
          descricao="Parâmetros da amostra entregue. Os valores iniciais são os do exemplo de referência do Manual."
        >
          <div className="grid grid-cols-3 gap-4">
            <Campo
              rotulo="PC · pol"
              valor={laboratorio.pc}
              aoMudar={(v) => e.definirLaboratorio({ pc: v })}
              min={8}
              max={22}
              passo={0.0001}
              unidade="%"
            />
            <Campo
              rotulo="Pu · pureza"
              valor={laboratorio.pureza}
              aoMudar={(v) => e.definirLaboratorio({ pureza: v })}
              min={70}
              max={95}
              passo={0.01}
              unidade="%"
            />
            <Campo
              rotulo="F · fibra"
              valor={laboratorio.fibra}
              aoMudar={(v) => e.definirLaboratorio({ fibra: v })}
              min={8}
              max={20}
              passo={0.01}
              unidade="%"
            />
          </div>

          <div className="mt-5 border-t border-linha pt-4">
            <p className="rotulo mb-2">Cálculo passo a passo</p>
            {atr.passos.map((p, i) => {
              const ultimo = i === atr.passos.length - 1;
              return (
                <div
                  key={p.rotulo}
                  className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1 ${
                    ultimo ? 'mt-1 border-t border-linha pt-2.5' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p
                      className={`text-[0.82rem] ${ultimo ? 'font-semibold text-tinta' : 'text-tinta-media'}`}
                    >
                      {p.rotulo}
                    </p>
                    <p className="dado text-[0.71rem] leading-snug text-tinta-fraca">
                      {p.substituido}
                    </p>
                  </div>
                  <p
                    className={`dado shrink-0 ${
                      ultimo
                        ? 'text-[1.2rem] font-semibold text-tinta'
                        : 'text-[0.88rem] text-tinta-media'
                    }`}
                  >
                    {num(p.valor, ultimo ? 2 : 4)}
                    {p.unidade && (
                      <span className="ml-1 text-[0.7rem] font-normal text-tinta-fraca">
                        {p.unidade}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </Secao>

        <div className="space-y-5">
          <Secao
            numero="2"
            titulo="Versão do Manual e preço de referência"
            descricao={
              <>
                A versão é parâmetro, não constante. A revisão de 2026 acrescenta um componente
                que fica <em>fora</em> da fórmula — reproduzir apenas a fórmula deixou de
                reproduzir a remuneração efetiva.
              </>
            }
          >
            <div className="flex flex-wrap gap-2">
              {VERSOES.map((v) => {
                const ativo = v.id === versao.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => e.definirVersao(v)}
                    aria-pressed={ativo}
                    className={`flex-1 basis-56 rounded-sm border px-3.5 py-2.5 text-left transition-colors ${
                      ativo
                        ? 'border-palha bg-palha/10'
                        : 'border-linha bg-papel hover:border-linha-forte'
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.88rem] font-semibold text-tinta">{v.rotulo}</span>
                      {v.fatorAdicional > 0 && (
                        <span className="dado text-[0.72rem] font-semibold text-perda">
                          +{num(v.fatorAdicional * 100, 1)}%
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[0.74rem] leading-snug text-tinta-fraca">
                      {v.descricao}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-linha pt-4">
              <Deslizante
                rotulo={
                  <ValorAuditavel disp={versao.refPreco}>
                    <span className="rotulo">Preço do kg de ATR</span>
                  </ValorAuditavel>
                }
                valor={precoKgAtr}
                aoMudar={e.definirPrecoKgAtr}
                min={0.3}
                max={1.4}
                passo={0.0005}
                formatar={(v) => brl(v, 4)}
              />
              <p className="mt-1.5 text-[0.74rem] text-tinta-fraca">{versao.fontePreco}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-linha pt-4">
              <ValorAuditavel disp="consecana.atr">
                <Metrica rotulo="ATR da amostra" valor={num(atr.valor, 2)} unidade="kg/t" />
              </ValorAuditavel>
              <ValorAuditavel disp={valorTonelada.ref}>
                <Metrica
                  rotulo="Valor da tonelada"
                  valor={brl(valorTonelada.valor)}
                  detalhe={
                    versao.fatorAdicional > 0
                      ? `inclui ${num(versao.fatorAdicional * 100, 1)}% fora da fórmula`
                      : 'fórmula de referência pura'
                  }
                />
              </ValorAuditavel>
            </div>
          </Secao>

          <Secao
            numero="3"
            titulo="Fator de ATR por classe de perda"
            descricao="Nem toda cana perdida vale o mesmo: o ápice tem teor de sacarose muito inferior ao do colmo. Estes fatores são hipótese declarada do projeto."
            acao={
              <button
                onClick={e.restaurarFatoresAtr}
                className="dado rounded-sm border border-linha px-2.5 py-1 text-[0.72rem] text-tinta-media transition-colors hover:border-linha-forte hover:text-tinta"
              >
                restaurar
              </button>
            }
          >
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <Selo tipo="hipotese" fase="Fase 3" />
              <ValorAuditavel disp="hipotese.fator-atr-classe">
                <span className="text-[0.78rem] text-tinta-media">declaração no projeto</span>
              </ValorAuditavel>
            </div>
            <div className="space-y-3.5">
              {CLASSES.map((c) => {
                const perfil = PERFIS[c];
                const [lo, hi] = perfil.fatorAtrIntervalo;
                return (
                  <div key={c} className="flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: perfil.cor }}
                      aria-hidden
                    />
                    <span className="w-[6.2rem] shrink-0 text-[0.82rem] text-tinta">
                      {perfil.rotulo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Deslizante
                        rotulo={`plausível ${num(lo, 2)}–${num(hi, 2)}`}
                        valor={fatoresAtr[c]}
                        aoMudar={(v) => e.definirFatorAtr(c, v)}
                        min={0.3}
                        max={1}
                        passo={0.01}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Secao>
        </div>
      </div>

      <Secao
        numero="4"
        titulo="Da perda física à remuneração perdida"
        descricao="O setor mede a perda em porcentagem de massa; o produtor é remunerado por quilo de ATR. Esta é a conversão que liga as duas coisas."
        acao={
          parcela ? (
            <Alternar
              rotulo="Usar a medição por imagem"
              ativo={usarMedicao}
              aoMudar={e.definirUsarMedicao}
              descricao={`${num(parcela.perdaKgHa, 0)} kg/ha medidos na camada I`}
            />
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Severidade severidade={perdas.severidade} percentual={perdas.percentualVisivel} />
          <span className="text-[0.78rem] text-tinta-fraca">
            origem: {usarMedicao && parcela ? 'medição por imagem' : 'histórico do talhão'}
          </span>
          <ValorAuditavel disp="ctc.severidade">
            <span className="text-[0.78rem] text-tinta-media">escala CTC</span>
          </ValorAuditavel>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <table className="w-full text-[0.82rem]">
              <caption className="sr-only">
                Perda por classe, convertida em ATR e em reais por hectare
              </caption>
              <thead>
                <tr className="border-b border-linha-forte text-left">
                  <th className="rotulo pb-1.5 font-normal">Classe</th>
                  <th className="rotulo pb-1.5 text-right font-normal">kg/ha</th>
                  <th className="rotulo pb-1.5 text-right font-normal">fator</th>
                  <th className="rotulo pb-1.5 text-right font-normal">kg ATR/ha</th>
                  <th className="rotulo pb-1.5 text-right font-normal">R$/ha</th>
                </tr>
              </thead>
              <tbody>
                {perdas.linhas.map((l) => (
                  <tr
                    key={l.classe}
                    className={`border-b border-linha/60 ${l.estimada ? 'bg-solo/[0.06]' : ''}`}
                  >
                    <td className="py-1.5">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: l.cor }}
                          aria-hidden
                        />
                        <span className={l.estimada ? 'italic text-tinta-media' : 'text-tinta'}>
                          {l.rotulo}
                        </span>
                      </span>
                    </td>
                    <td className="dado py-1.5 text-right text-tinta-media">
                      {num(l.perdaKgHa, 0)}
                    </td>
                    <td className="dado py-1.5 text-right text-tinta-fraca">
                      {num(l.fatorAtr, 2)}
                    </td>
                    <td className="dado py-1.5 text-right text-tinta-media">
                      {num(l.atrPerdidoKgHa, 1)}
                    </td>
                    <td className="dado py-1.5 text-right font-medium text-tinta">
                      {brl(l.reaisPorHa)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-tinta">
                  <td className="py-2 font-semibold text-tinta">Total</td>
                  <td className="dado py-2 text-right font-semibold text-tinta">
                    {num(perdas.perdaTotalKgHa, 0)}
                  </td>
                  <td />
                  <td className="dado py-2 text-right font-semibold text-tinta">
                    {num(perdas.atrPerdidoKgHa, 1)}
                  </td>
                  <td className="dado py-2 text-right font-semibold text-perda">
                    {brl(perdas.reaisPorHaTotal)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 border-t border-linha pt-3.5">
              <Alternar
                rotulo="Incluir a perda invisível estimada"
                ativo={incluirInvisivel}
                aoMudar={e.definirIncluirInvisivel}
                descricao={
                  <>
                    A fração fina expelida pelos extratores carrega açúcar em concentração
                    comparável à do colmo. Entra em linha própria, nunca somada em silêncio à
                    perda medida.{' '}
                    <ValorAuditavel disp={PERDA_INVISIVEL.ref}>
                      <span className="text-tinta-media underline decoration-linha-forte underline-offset-2">
                        literatura
                      </span>
                    </ValorAuditavel>
                  </>
                }
              />
              {incluirInvisivel && (
                <div className="surgir mt-3 max-w-sm">
                  <Deslizante
                    rotulo="razão invisível sobre visível"
                    valor={razaoInvisivel}
                    aoMudar={e.definirRazaoInvisivel}
                    min={0.5}
                    max={1.5}
                    passo={0.05}
                    formatar={(v) => `${num(v, 2)}×`}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Cascata perdas={perdas} precoKgAtr={precoKgAtr} />
            <div className="grid grid-cols-2 gap-4 border-t border-linha pt-4">
              <Metrica
                rotulo="Remuneração perdida"
                valor={brl(perdas.reaisPorHaTotal)}
                unidade="/ ha"
                cor="var(--color-perda)"
                tamanho="grande"
              />
              <Metrica
                rotulo={`No talhão · ${num(talhao.areaHa, 1)} ha`}
                valor={brl(perdaNoTalhao, 0)}
                detalhe={`equivale a ${brl(perdas.reaisPorToneladaEntregue)} por tonelada entregue`}
                tamanho="grande"
              />
            </div>
          </div>
        </div>
      </Secao>
    </div>
  );
}

function PainelRegressao({ regressao }: { regressao: ReturnType<typeof rodarRegressaoManual> }) {
  const ok = regressao.aprovado;
  return (
    <div
      className={`cartao flex flex-wrap items-center gap-x-8 gap-y-3 border-l-[3px] px-5 py-3.5 ${
        ok ? 'border-l-baixo' : 'border-l-alto'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`dado flex size-6 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold ${
            ok ? 'bg-baixo/15 text-baixo' : 'bg-alto/15 text-alto'
          }`}
          aria-hidden
        >
          {ok ? '✓' : '✕'}
        </span>
        <div>
          <p className="text-[0.88rem] font-semibold text-tinta">
            {ok ? 'Motor conforme o Manual' : 'Motor divergente do Manual'}
          </p>
          <p className="text-[0.76rem] text-tinta-fraca">
            Teste de regressão permanente, executado agora nesta tela
          </p>
        </div>
      </div>

      <div className="dado flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[0.78rem]">
        <span className="text-tinta-fraca">
          PC {num(EXEMPLO_MANUAL.entrada.pc, 4)} · Pu {num(EXEMPLO_MANUAL.entrada.pureza, 2)} · F{' '}
          {num(EXEMPLO_MANUAL.entrada.fibra, 2)}
        </span>
        <span className="text-tinta-media">
          ATR obtido <strong className="text-tinta">{num(regressao.atrObtido, 2)}</strong> ·
          esperado {num(regressao.atrEsperado, 2)} kg/t
        </span>
        <span className="text-tinta-media">
          Valor <strong className="text-tinta">{brl(regressao.valorObtido)}</strong> · esperado{' '}
          {brl(regressao.valorEsperado)} por t
        </span>
      </div>

      <ValorAuditavel disp="consecana.exemplo-referencia">
        <span className="text-[0.78rem] text-tinta-media">exemplo do Manual</span>
      </ValorAuditavel>
    </div>
  );
}

function SeletorTalhao() {
  const { talhao, definirTalhao } = useEstudo();
  return (
    <label className="shrink-0">
      <span className="rotulo">Talhão em análise</span>
      <select
        value={talhao.id}
        onChange={(ev) => definirTalhao(ev.target.value)}
        className="dado mt-1 block border border-linha bg-papel-alto px-3 py-1.5 text-[0.85rem] text-tinta outline-none transition-colors focus:border-palha"
      >
        {TALHOES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome} · {pct(t.percentualPerda)} · {t.variedade}
          </option>
        ))}
      </select>
    </label>
  );
}
