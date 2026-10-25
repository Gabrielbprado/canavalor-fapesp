'use client';

/**
 * Distribuição da remuneração perdida, com os percentis marcados.
 *
 * A forma existe para dizer uma coisa só: o resultado é um intervalo. Um número
 * único no lugar disto esconderia justamente a incerteza que o módulo existe
 * para representar.
 */

import { useId, useState } from 'react';
import type { ResultadoSimulacao } from '../../lib/simulacao/montecarlo';
import { brl } from '../formato';

const L = 8;
const R = 8;
const T = 14;
const B = 30;

export function Histograma({ resultado }: { resultado: ResultadoSimulacao }) {
  const id = useId();
  const [sobre, setSobre] = useState<number | null>(null);

  const largura = 560;
  const altura = 210;
  const util = largura - L - R;
  const alturaUtil = altura - T - B;

  const min = resultado.histograma[0].inicio;
  const max = resultado.histograma[resultado.histograma.length - 1].fim;
  const maiorContagem = Math.max(...resultado.histograma.map((f) => f.contagem));
  const escalaX = (v: number) => L + ((v - min) / (max - min)) * util;

  const marcas: { valor: number; rotulo: string; forte: boolean }[] = [
    { valor: resultado.p5, rotulo: 'P5', forte: false },
    { valor: resultado.p50, rotulo: 'P50', forte: true },
    { valor: resultado.p95, rotulo: 'P95', forte: false },
  ];

  const faixa = sobre !== null ? resultado.histograma[sobre] : null;

  return (
    <figure className="m-0">
      <figcaption className="rotulo mb-2">
        Distribuição da remuneração perdida · R$ por hectare
      </figcaption>

      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        className="w-full"
        role="img"
        aria-labelledby={`${id}-titulo`}
      >
        <title id={`${id}-titulo`}>
          {`Histograma de ${resultado.iteracoes.toLocaleString('pt-BR')} simulações, com mediana em ${brl(resultado.p50)} por hectare`}
        </title>

        {/* Faixa interquartil ao fundo: onde metade dos cenários cai. */}
        <rect
          x={escalaX(resultado.p25)}
          y={T}
          width={Math.max(1, escalaX(resultado.p75) - escalaX(resultado.p25))}
          height={alturaUtil}
          fill="var(--color-palha)"
          opacity={0.1}
        />

        {resultado.histograma.map((f, i) => {
          const x = escalaX(f.inicio);
          const w = Math.max(1, escalaX(f.fim) - x - 1.5);
          const h = (f.contagem / maiorContagem) * alturaUtil;
          return (
            <rect
              key={i}
              x={x}
              y={T + alturaUtil - h}
              width={w}
              height={h}
              rx={1.5}
              fill="var(--color-tinta-media)"
              opacity={sobre === null || sobre === i ? 0.82 : 0.34}
              onMouseEnter={() => setSobre(i)}
              onMouseLeave={() => setSobre(null)}
            />
          );
        })}

        <line
          x1={L}
          y1={T + alturaUtil}
          x2={largura - R}
          y2={T + alturaUtil}
          stroke="var(--color-linha-forte)"
          strokeWidth={1}
        />

        {marcas.map((m) => (
          <g key={m.rotulo}>
            <line
              x1={escalaX(m.valor)}
              y1={T - 6}
              x2={escalaX(m.valor)}
              y2={T + alturaUtil}
              stroke={m.forte ? 'var(--color-perda)' : 'var(--color-tinta-fraca)'}
              strokeWidth={m.forte ? 1.8 : 1}
              strokeDasharray={m.forte ? undefined : '3 3'}
            />
            <text
              x={escalaX(m.valor)}
              y={T + alturaUtil + 13}
              textAnchor="middle"
              className="dado"
              fontSize={9.5}
              fill={m.forte ? 'var(--color-perda)' : 'var(--color-tinta-fraca)'}
            >
              {m.rotulo}
            </text>
            <text
              x={escalaX(m.valor)}
              y={T + alturaUtil + 24}
              textAnchor="middle"
              className="dado"
              fontSize={9.5}
              fill="var(--color-tinta-media)"
            >
              {brl(m.valor, 0)}
            </text>
          </g>
        ))}
      </svg>

      <p className="dado mt-1 min-h-[1.1rem] text-[0.72rem] text-tinta-fraca">
        {faixa
          ? `${brl(faixa.inicio, 0)} – ${brl(faixa.fim, 0)} · ${faixa.contagem.toLocaleString('pt-BR')} simulações (${((faixa.contagem / resultado.iteracoes) * 100).toFixed(1)}%)`
          : `Faixa sombreada: metade dos cenários, entre P25 e P75.`}
      </p>
    </figure>
  );
}
