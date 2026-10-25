'use client';

/**
 * Cascata da conversão: massa perdida → ATR perdido → reais por hectare.
 *
 * A escolha da forma segue o trabalho do dado: mostrar como uma grandeza se
 * transforma em outra através de etapas nomeadas. Uma barra empilhada esconderia
 * justamente a transformação, que é o argumento central do projeto.
 */

import type { ResultadoPerdas } from '../../lib/consecana/perdas';
import { brl, num } from '../formato';

export function Cascata({
  perdas,
  precoKgAtr,
}: {
  perdas: ResultadoPerdas;
  precoKgAtr: number;
}) {
  const etapas = [
    {
      rotulo: 'Massa perdida',
      valor: perdas.perdaTotalKgHa,
      texto: `${num(perdas.perdaTotalKgHa, 0)} kg/ha`,
      nota: `${num(perdas.percentualTotal, 2)}% da produtividade`,
    },
    {
      rotulo: 'ATR perdido',
      valor: perdas.atrPerdidoKgHa,
      texto: `${num(perdas.atrPerdidoKgHa, 1)} kg ATR/ha`,
      nota: 'ponderado pelo fator de cada classe',
    },
    {
      rotulo: 'Remuneração perdida',
      valor: perdas.reaisPorHaTotal,
      texto: brl(perdas.reaisPorHaTotal),
      nota: `a ${brl(precoKgAtr, 4)} por kg de ATR`,
    },
  ];

  // Cada etapa tem unidade própria, então a barra representa a grandeza em sua
  // própria escala. Um eixo único e compartilhado seria falso aqui.
  const maiores = etapas.map((e) => e.valor);

  return (
    <div>
      <p className="rotulo mb-3">Cadeia de conversão</p>
      <ol className="space-y-3">
        {etapas.map((etapa, i) => (
          <li key={etapa.rotulo} className="relative">
            {i > 0 && (
              <span
                className="dado absolute -top-2.5 left-3 text-[0.7rem] leading-none text-linha-forte"
                aria-hidden
              >
                ↓
              </span>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.8rem] text-tinta-media">{etapa.rotulo}</span>
              <span className="dado text-[0.95rem] font-semibold text-tinta">{etapa.texto}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-sm bg-papel-fundo">
              <div
                className="h-full rounded-sm transition-[width] duration-500 ease-out"
                style={{
                  width: `${Math.max(4, (maiores[i] / Math.max(...maiores)) * 100)}%`,
                  backgroundColor:
                    i === etapas.length - 1 ? 'var(--color-perda)' : 'var(--color-tinta-media)',
                }}
              />
            </div>
            <p className="mt-1 text-[0.72rem] leading-snug text-tinta-fraca">{etapa.nota}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
