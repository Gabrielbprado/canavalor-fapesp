'use client';

import { useMemo, useState } from 'react';
import { calcularPerdas } from '../../lib/consecana/perdas';
import { CENARIOS_PRECO, simular, type EntradaSimulacao } from '../../lib/simulacao/montecarlo';
import type { Triangular } from '../../lib/simulacao/distribuicoes';
import { CLASSES, type ClassePerda } from '../../lib/dominio';
import { useEstudo } from '../../components/estado';
import { brl, num, pct } from '../../components/formato';
import { Selo, ValorAuditavel } from '../../components/ValorAuditavel';
import { Deslizante, Metrica, Secao } from '../../components/ui';
import { Histograma } from '../../components/charts/Histograma';

const SEMENTE = 20260901;

export default function PaginaSimulacao() {
  const e = useEstudo();
  const { talhao, versao, precoKgAtr, fatoresAtr, incluirInvisivel, razaoInvisivel, parcela, usarMedicao } = e;

  const [cenario, setCenario] = useState<keyof typeof CENARIOS_PRECO>('2026-27');
  const [preco, setPreco] = useState<Triangular>(CENARIOS_PRECO['2026-27'].dist);
  const [mix, setMix] = useState<Triangular>({ min: 0.44, moda: 0.51, max: 0.58 });
  const [premio, setPremio] = useState(1.06);
  const [fracaoAdiantada, setFracaoAdiantada] = useState(0.7);
  const [iteracoes, setIteracoes] = useState(10_000);

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
    [perdaPorClasse, talhao, precoKgAtr, versao.fatorAdicional, fatoresAtr, incluirInvisivel, razaoInvisivel],
  );

  const entrada = useMemo<EntradaSimulacao>(
    () => ({
      atrPerdidoKgHa: perdas.atrPerdidoKgHa,
      precoKgAtr: preco,
      mixAcucar: mix,
      premioAcucar: premio,
      fatorAdicional: versao.fatorAdicional,
      fracaoAdiantada,
      precoAdiantamento: preco.min,
      iteracoes,
      semente: SEMENTE,
    }),
    [perdas.atrPerdidoKgHa, preco, mix, premio, versao.fatorAdicional, fracaoAdiantada, iteracoes],
  );

  const r = useMemo(() => simular(entrada), [entrada]);
  const amplitude = r.p50 > 0 ? ((r.p95 - r.p5) / r.p50) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="rotulo">Camada III</p>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-tinta">
          Remuneração sob incerteza de preço e mix
        </h1>
        <p className="mt-1 max-w-[80ch] text-[0.88rem] leading-relaxed text-tinta-media">
          O fornecedor entrega a cana e recebe adiantamentos ao longo da safra; o valor definitivo
          só fecha no acerto anual, conforme o mix realizado e o preço acumulado do quilo de ATR.
          É esse descasamento entre entrega e pagamento que torna a projeção um intervalo — e não
          um número.{' '}
          <ValorAuditavel disp="consecana.acerto-retroativo">
            <span className="text-tinta-media underline decoration-linha-forte underline-offset-2">
              acerto de safra
            </span>
          </ValorAuditavel>
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Secao
            titulo="Projeção da remuneração perdida"
            descricao={`${r.iteracoes.toLocaleString('pt-BR')} simulações sobre ${num(perdas.atrPerdidoKgHa, 1)} kg de ATR perdidos por hectare no ${talhao.nome}.`}
            acao={
              <span className="dado rounded-sm border border-linha px-2 py-1 text-[0.7rem] text-tinta-fraca">
                semente {r.semente}
              </span>
            }
          >
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Metrica rotulo="P5 · otimista" valor={brl(r.p5, 0)} unidade="/ha" />
              <Metrica
                rotulo="P50 · mediana"
                valor={brl(r.p50, 0)}
                unidade="/ha"
                cor="var(--color-perda)"
                tamanho="grande"
              />
              <Metrica rotulo="P95 · pessimista" valor={brl(r.p95, 0)} unidade="/ha" />
              <Metrica
                rotulo="Amplitude"
                valor={pct(amplitude, 0)}
                detalhe="do P5 ao P95, sobre a mediana"
              />
            </div>

            <Histograma resultado={r} />

            <p className="mt-3 border-t border-linha pt-3 text-[0.78rem] leading-relaxed text-tinta-media">
              A mesma semente reproduz sempre o mesmo resultado. Rodar de novo aqui, à frente da
              banca, devolve exatamente estes percentis — a incerteza é do mercado, não do método.
            </p>
          </Secao>

          <Secao
            titulo="Adiantamentos e acerto de safra"
            descricao="Parte do valor é paga durante a safra ao preço corrente; o restante só se resolve no fechamento, com o mix realizado e o preço acumulado."
          >
            <CascataAcerto
              adiantado={r.adiantadoMedio}
              acerto={r.acertoMedio}
              total={r.media}
              fatorAdicional={versao.fatorAdicional}
              safras={versao.safrasRetroativas}
            />
          </Secao>
        </div>

        <div className="space-y-5">
          <Secao
            titulo="Incerteza de preço"
            descricao="Distribuição triangular: mínimo, mais provável e máximo."
            acao={<Selo tipo="arbitrado" />}
          >
            <div className="mb-4 flex flex-wrap gap-1.5">
              {(Object.keys(CENARIOS_PRECO) as (keyof typeof CENARIOS_PRECO)[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    setCenario(k);
                    setPreco(CENARIOS_PRECO[k].dist);
                  }}
                  aria-pressed={cenario === k}
                  className={`rounded-sm border px-2.5 py-1.5 text-[0.76rem] transition-colors ${
                    cenario === k
                      ? 'border-palha bg-palha/12 text-tinta'
                      : 'border-linha text-tinta-media hover:border-linha-forte'
                  }`}
                >
                  {CENARIOS_PRECO[k].rotulo}
                </button>
              ))}
            </div>

            <div className="space-y-3.5">
              <Deslizante
                rotulo="mínimo"
                valor={preco.min}
                aoMudar={(v) => setPreco((p) => ({ ...p, min: Math.min(v, p.moda) }))}
                min={0.3}
                max={1.4}
                passo={0.005}
                formatar={(v) => brl(v, 4)}
              />
              <Deslizante
                rotulo="mais provável"
                valor={preco.moda}
                aoMudar={(v) =>
                  setPreco((p) => ({ ...p, moda: Math.max(p.min, Math.min(v, p.max)) }))
                }
                min={0.3}
                max={1.4}
                passo={0.005}
                formatar={(v) => brl(v, 4)}
              />
              <Deslizante
                rotulo="máximo"
                valor={preco.max}
                aoMudar={(v) => setPreco((p) => ({ ...p, max: Math.max(v, p.moda) }))}
                min={0.3}
                max={1.6}
                passo={0.005}
                formatar={(v) => brl(v, 4)}
              />
            </div>

            <p className="mt-3.5 border-t border-linha pt-3 text-[0.75rem] leading-relaxed text-tinta-fraca">
              Os documentos do projeto pedem simulação de cenários e resultado como intervalo, sem
              fixar a distribuição. A triangular é a escolha transparente com poucos dados: pede
              três números que um analista de mercado consegue defender, em vez de uma média e um
              desvio que ninguém mediu.{' '}
              <ValorAuditavel disp={CENARIOS_PRECO[cenario].ref}>
                <span className="text-tinta-media">fonte do cenário</span>
              </ValorAuditavel>
            </p>
          </Secao>

          <Secao
            titulo="Mix açúcar e etanol"
            descricao="Participação do açúcar na cesta de produtos, e o prêmio que ele carrega sobre o etanol."
            acao={<Selo tipo="parametro" />}
          >
            <div className="space-y-3.5">
              <Deslizante
                rotulo="mínimo"
                valor={mix.min}
                aoMudar={(v) => setMix((m) => ({ ...m, min: Math.min(v, m.moda) }))}
                min={0.25}
                max={0.75}
                passo={0.01}
                formatar={(v) => pct(v * 100, 0)}
              />
              <Deslizante
                rotulo="mais provável"
                valor={mix.moda}
                aoMudar={(v) => setMix((m) => ({ ...m, moda: Math.max(m.min, Math.min(v, m.max)) }))}
                min={0.25}
                max={0.75}
                passo={0.01}
                formatar={(v) => pct(v * 100, 0)}
              />
              <Deslizante
                rotulo="máximo"
                valor={mix.max}
                aoMudar={(v) => setMix((m) => ({ ...m, max: Math.max(v, m.moda) }))}
                min={0.25}
                max={0.85}
                passo={0.01}
                formatar={(v) => pct(v * 100, 0)}
              />
              <div className="border-t border-linha pt-3.5">
                <Deslizante
                  rotulo="prêmio do açúcar sobre o etanol"
                  valor={premio}
                  aoMudar={setPremio}
                  min={0.85}
                  max={1.3}
                  passo={0.01}
                  formatar={(v) => `${num(v, 2)}×`}
                />
              </div>
            </div>
            <p className="mt-3.5 border-t border-linha pt-3 text-[0.75rem] leading-relaxed text-tinta-fraca">
              A fórmula que liga o mix ao preço do ATR não consta dos documentos disponíveis; o
              dispositivo do Manual permanece{' '}
              <ValorAuditavel disp="consecana.mix">
                <span className="text-tinta-media">por indexar</span>
              </ValorAuditavel>
              . O prêmio aqui é um parâmetro explícito, não uma reprodução da norma.
            </p>
          </Secao>

          <Secao titulo="Execução">
            <div className="space-y-4">
              <Deslizante
                rotulo="fração paga como adiantamento"
                valor={fracaoAdiantada}
                aoMudar={setFracaoAdiantada}
                min={0}
                max={1}
                passo={0.05}
                formatar={(v) => pct(v * 100, 0)}
              />
              <Deslizante
                rotulo="iterações"
                valor={iteracoes}
                aoMudar={setIteracoes}
                min={1000}
                max={50_000}
                passo={1000}
                formatar={(v) => v.toLocaleString('pt-BR')}
              />
              <div className="dado border-t border-linha pt-3 text-[0.74rem] leading-relaxed text-tinta-fraca">
                média {brl(r.media)} · desvio {brl(r.desvio)} · a curva estabiliza em{' '}
                {r.convergencia[r.convergencia.length - 1]?.iteracao.toLocaleString('pt-BR')}{' '}
                iterações
              </div>
            </div>
          </Secao>
        </div>
      </div>
    </div>
  );
}

function CascataAcerto({
  adiantado,
  acerto,
  total,
  fatorAdicional,
  safras,
}: {
  adiantado: number;
  acerto: number;
  total: number;
  fatorAdicional: number;
  safras?: string[];
}) {
  const maior = Math.max(total, 1);
  const partes = [
    {
      rotulo: 'Adiantamentos durante a safra',
      valor: adiantado,
      cor: 'var(--color-tinta-media)',
      nota: 'pagos ao preço corrente, sem o mix realizado',
    },
    {
      rotulo: 'Acerto no fechamento',
      valor: acerto,
      cor: 'var(--color-perda)',
      nota: 'resolve o mix e o preço acumulado da safra',
    },
  ];

  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-sm border border-linha">
        {partes.map((p) => (
          <div
            key={p.rotulo}
            className="flex items-center justify-center transition-[width] duration-500"
            style={{
              width: `${Math.max(2, (p.valor / maior) * 100)}%`,
              backgroundColor: p.cor,
            }}
          >
            <span className="dado px-2 text-[0.72rem] font-medium text-papel">
              {brl(p.valor, 0)}
            </span>
          </div>
        ))}
      </div>

      <dl className="mt-3.5 space-y-2.5">
        {partes.map((p) => (
          <div key={p.rotulo} className="flex items-baseline gap-2.5">
            <span
              className="mt-1 size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: p.cor }}
              aria-hidden
            />
            <div className="min-w-0">
              <dt className="text-[0.84rem] text-tinta">{p.rotulo}</dt>
              <dd className="text-[0.75rem] leading-snug text-tinta-fraca">{p.nota}</dd>
            </div>
          </div>
        ))}
      </dl>

      {fatorAdicional > 0 && safras && (
        <p className="mt-4 border-l-2 border-palha bg-palha/8 px-3.5 py-2.5 text-[0.79rem] leading-relaxed text-tinta-media">
          A revisão de 2026 acrescenta {num(fatorAdicional * 100, 1)}% garantidos ao produtor, com
          efeito retroativo sobre as safras {safras.join(' e ')} — um componente que fica fora da
          fórmula de referência e que uma implementação presa à 5ª edição simplesmente não veria.{' '}
          <ValorAuditavel disp="consecana.revisao-2026">
            <span className="text-tinta">ver dispositivo</span>
          </ValorAuditavel>
        </p>
      )}
    </div>
  );
}
