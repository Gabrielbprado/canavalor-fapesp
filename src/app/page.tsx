'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { calcularPerdas } from '../lib/consecana/perdas';
import { CLASSES, MERCADO, PERFIS, classificarSeveridade } from '../lib/dominio';
import { TALHOES, UNIDADE } from '../lib/dados/talhoes';
import { useEstudo } from '../components/estado';
import { brl, brlCompacto, num, pct } from '../components/formato';
import { ValorAuditavel } from '../components/ValorAuditavel';
import { Metrica, Secao, Severidade } from '../components/ui';
import { MapaTalhoes } from '../components/charts/MapaTalhoes';

export default function Painel() {
  const e = useEstudo();
  const { talhao, precoKgAtr, versao, fatoresAtr } = e;

  /** Perda de cada talhão em reais por hectare, na mesma base de cálculo. */
  const porTalhao = useMemo(
    () =>
      TALHOES.map((t) => {
        const p = calcularPerdas({
          perdaPorClasseKgHa: t.perdaPorClasseKgHa,
          atrTalhaoKgT: t.atrKgT,
          produtividadeTHa: t.produtividadeTHa,
          precoKgAtr,
          fatorAdicional: versao.fatorAdicional,
          fatoresAtr,
          incluirInvisivel: false,
        });
        return { talhao: t, perdas: p, total: p.reaisPorHaTotal * t.areaHa };
      }),
    [precoKgAtr, versao.fatorAdicional, fatoresAtr],
  );

  const totalUnidade = porTalhao.reduce((s, x) => s + x.total, 0);
  const areaTotal = UNIDADE.areaTotalHa;
  const mediaPorHa = totalUnidade / areaTotal;
  const perdaMediaPct =
    porTalhao.reduce((s, x) => s + x.talhao.percentualPerda * x.talhao.areaHa, 0) / areaTotal;
  const ranking = [...porTalhao].sort((a, b) => b.perdas.reaisPorHaTotal - a.perdas.reaisPorHaTotal);
  const atual = porTalhao.find((x) => x.talhao.id === talhao.id)!;

  // Massa perdida por classe em toda a unidade, ponderada pela área.
  const porClasse = useMemo(() => {
    const acumulado = Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<
      (typeof CLASSES)[number],
      number
    >;
    for (const { talhao: t } of porTalhao) {
      for (const c of CLASSES) acumulado[c] += (t.perdaPorClasseKgHa[c] * t.areaHa) / 1000;
    }
    return acumulado;
  }, [porTalhao]);
  const massaTotal = CLASSES.reduce((s, c) => s + porClasse[c], 0);

  return (
    <div className="space-y-5">
      <div className="marca-sintetica relative overflow-hidden">
        <p className="rotulo">Safra {UNIDADE.safra} · {UNIDADE.nome}</p>
        <h1 className="mt-1 max-w-[22ch] font-display text-[2.3rem] font-semibold leading-[1.08] tracking-tight text-tinta">
          A perda de colheita, medida em reais
        </h1>
        <p className="mt-2 max-w-[76ch] text-[0.92rem] leading-relaxed text-tinta-media">
          O setor mede a perda mecanizada em porcentagem de massa. O produtor é remunerado por
          quilo de ATR. Enquanto essas duas contas não se encontram, a perda física continua sendo
          um problema agronômico — e não uma linha no acerto de safra.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cartao px-5 py-4">
          <Metrica
            rotulo="Perda na unidade"
            valor={brlCompacto(totalUnidade)}
            detalhe={`${num(areaTotal, 1)} ha colhidos`}
            cor="var(--color-perda)"
            tamanho="grande"
          />
        </div>
        <div className="cartao px-5 py-4">
          <Metrica
            rotulo="Média por hectare"
            valor={brl(mediaPorHa, 0)}
            detalhe={`a ${brl(precoKgAtr, 4)} por kg de ATR`}
            tamanho="grande"
          />
        </div>
        <div className="cartao px-5 py-4">
          <Metrica
            rotulo="Perda física média"
            valor={pct(perdaMediaPct)}
            detalhe={`${num(massaTotal, 0)} t de cana no chão`}
            tamanho="grande"
          />
          <div className="mt-2">
            <Severidade
              severidade={classificarSeveridade(perdaMediaPct)}
              percentual={perdaMediaPct}
            />
          </div>
        </div>
        <div className="cartao px-5 py-4">
          <ValorAuditavel disp={MERCADO.refCusto}>
            <Metrica
              rotulo="Custo do produtor"
              valor={brl(MERCADO.custoPorKgAtr, 4)}
              unidade="/ kg ATR"
              tamanho="grande"
            />
          </ValorAuditavel>
          <p className="mt-2 text-[0.75rem] leading-snug text-tinta-media">
            Contra receita projetada de {brl(MERCADO.precoAtrProjetado, 4)}: margem negativa para
            o produtor médio em 2026/27. É nesse aperto que cada quilo perdido pesa.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Secao
          titulo="Talhões da unidade"
          descricao="Doze talhões georreferenciados, sombreados pela perda física. A seleção acompanha você pelas três camadas."
        >
          <MapaTalhoes
            talhoes={TALHOES}
            selecionado={talhao.id}
            aoSelecionar={e.definirTalhao}
          />
        </Secao>

        <div className="space-y-5">
          <Secao
            titulo={talhao.nome}
            descricao={`${talhao.variedade} · ${talhao.corte}º corte · colhedora ${talhao.colhedora} · ${talhao.dataColheita}`}
            acao={
              <Severidade
                severidade={atual.perdas.severidade}
                percentual={atual.perdas.percentualVisivel}
              />
            }
          >
            <div className="grid grid-cols-2 gap-4">
              <Metrica rotulo="Área" valor={num(talhao.areaHa, 1)} unidade="ha" />
              <Metrica
                rotulo="Produtividade"
                valor={num(talhao.produtividadeTHa, 1)}
                unidade="t/ha"
              />
              <Metrica rotulo="ATR do talhão" valor={num(talhao.atrKgT, 2)} unidade="kg/t" />
              <Metrica
                rotulo="Perda física"
                valor={num(talhao.perdaTotalKgHa, 0)}
                unidade="kg/ha"
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-linha pt-4">
              <Metrica
                rotulo="Remuneração perdida"
                valor={brl(atual.perdas.reaisPorHaTotal)}
                unidade="/ ha"
                cor="var(--color-perda)"
                tamanho="grande"
              />
              <Metrica
                rotulo="No talhão inteiro"
                valor={brlCompacto(atual.total)}
                tamanho="grande"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-linha pt-4">
              <Link
                href="/aquisicao"
                className="rounded-sm border border-linha-forte bg-papel px-3 py-1.5 text-[0.8rem] text-tinta transition-colors hover:border-palha"
              >
                I · medir na imagem
              </Link>
              <Link
                href="/motor"
                className="rounded-sm border border-linha-forte bg-papel px-3 py-1.5 text-[0.8rem] text-tinta transition-colors hover:border-palha"
              >
                II · converter em reais
              </Link>
              <Link
                href="/simulacao"
                className="rounded-sm border border-linha-forte bg-papel px-3 py-1.5 text-[0.8rem] text-tinta transition-colors hover:border-palha"
              >
                III · projetar o intervalo
              </Link>
            </div>
          </Secao>

          <Secao
            titulo="Composição da perda"
            descricao="Massa perdida em toda a unidade, por classe de fragmento."
          >
            <ul className="space-y-2.5">
              {CLASSES.map((c) => {
                const t = porClasse[c];
                const fracao = massaTotal > 0 ? t / massaTotal : 0;
                return (
                  <li key={c}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="flex items-center gap-2 text-[0.83rem] text-tinta">
                        <span
                          className="size-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: PERFIS[c].cor }}
                          aria-hidden
                        />
                        {PERFIS[c].rotulo}
                      </span>
                      <span className="dado shrink-0 text-[0.82rem] text-tinta-media">
                        {num(t, 1)} t · {pct(fracao * 100, 0)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-papel-fundo">
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${fracao * 100}%`,
                          backgroundColor: PERFIS[c].cor,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Secao>
        </div>
      </div>

      <Secao
        titulo="Talhões por remuneração perdida"
        descricao="Ordenados pelo que custam por hectare — não pela porcentagem de massa, que é a leitura que o setor usa hoje e que trata todas as classes como iguais."
      >
        <table className="w-full text-[0.82rem]">
          <thead>
            <tr className="border-b border-linha-forte text-left">
              <th className="rotulo pb-1.5 font-normal">Talhão</th>
              <th className="rotulo pb-1.5 font-normal">Variedade</th>
              <th className="rotulo pb-1.5 text-right font-normal">Área</th>
              <th className="rotulo pb-1.5 text-right font-normal">Perda</th>
              <th className="rotulo pb-1.5 font-normal">Severidade</th>
              <th className="rotulo pb-1.5 text-right font-normal">R$/ha</th>
              <th className="rotulo pb-1.5 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map(({ talhao: t, perdas, total }) => {
              const sev = classificarSeveridade(t.percentualPerda);
              const ativo = t.id === talhao.id;
              return (
                <tr
                  key={t.id}
                  onClick={() => e.definirTalhao(t.id)}
                  className={`cursor-pointer border-b border-linha/60 transition-colors ${
                    ativo ? 'bg-palha/12' : 'hover:bg-papel-fundo/60'
                  }`}
                >
                  <td className="dado py-1.5 font-medium text-tinta">{t.id}</td>
                  <td className="py-1.5 text-tinta-media">{t.variedade}</td>
                  <td className="dado py-1.5 text-right text-tinta-media">
                    {num(t.areaHa, 1)} ha
                  </td>
                  <td className="dado py-1.5 text-right text-tinta-media">
                    {pct(t.percentualPerda)}
                  </td>
                  <td className="py-1.5">
                    <span className="dado text-[0.76rem]" style={{ color: sev.cor }}>
                      {sev.simbolo} {sev.rotulo}
                    </span>
                  </td>
                  <td className="dado py-1.5 text-right font-medium text-tinta">
                    {brl(perdas.reaisPorHaTotal)}
                  </td>
                  <td className="dado py-1.5 text-right text-perda">{brlCompacto(total)}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-tinta">
              <td className="py-2 font-semibold text-tinta" colSpan={2}>
                Unidade Piloto
              </td>
              <td className="dado py-2 text-right font-semibold text-tinta">
                {num(areaTotal, 1)} ha
              </td>
              <td className="dado py-2 text-right font-semibold text-tinta">
                {pct(perdaMediaPct)}
              </td>
              <td />
              <td className="dado py-2 text-right font-semibold text-tinta">
                {brl(mediaPorHa, 0)}
              </td>
              <td className="dado py-2 text-right font-semibold text-perda">
                {brlCompacto(totalUnidade)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-3 border-t border-linha pt-3 text-[0.78rem] leading-relaxed text-tinta-media">
          Referências do Centro-Sul na safra 2025/26:{' '}
          <ValorAuditavel disp={MERCADO.refUnica}>
            <span className="dado text-tinta">
              {num(MERCADO.produtividadeTHa, 1)} t/ha e {num(MERCADO.atrMedioKgT, 2)} kg ATR/t
            </span>
          </ValorAuditavel>
          . A perda estimada pela literatura chega a{' '}
          <ValorAuditavel disp="literatura.perda-visivel">
            <span className="dado text-tinta">10% do que se colhe</span>
          </ValorAuditavel>
          , contra os 5% visíveis que o setor efetivamente contabiliza — um prejuízo estimado em{' '}
          <ValorAuditavel disp="literatura.impacto-economico">
            <span className="dado text-tinta">US$ 450 milhões por ano</span>
          </ValorAuditavel>{' '}
          para o setor.
        </p>
      </Secao>
    </div>
  );
}
