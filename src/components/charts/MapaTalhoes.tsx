'use client';

/**
 * Mapa dos talhões, colorido pela intensidade da perda.
 *
 * Rampa sequencial de um único matiz, clara para escura — magnitude tem ordem,
 * e um arco-íris destruiria essa leitura. A faixa de severidade CTC entra como
 * contorno e símbolo, não como segunda cor de preenchimento.
 */

import { useId } from 'react';
import { classificarSeveridade } from '../../lib/dominio';
import type { Talhao } from '../../lib/dados/talhoes';
import { num, pct } from '../formato';

/** Rampa sequencial em um matiz, do papel ao vermelho da perda. */
const RAMPA = ['#f2e4d8', '#e7c3ab', '#d99b80', '#c67158', '#ad4a36', '#8c2f1f'];

function corDaPerda(percentual: number, maximo: number): string {
  const t = Math.min(1, Math.max(0, percentual / maximo));
  return RAMPA[Math.min(RAMPA.length - 1, Math.floor(t * RAMPA.length))];
}

export function MapaTalhoes({
  talhoes,
  selecionado,
  aoSelecionar,
}: {
  talhoes: Talhao[];
  selecionado: string;
  aoSelecionar: (id: string) => void;
}) {
  const id = useId();
  const maximo = Math.max(...talhoes.map((t) => t.percentualPerda));

  return (
    <figure className="m-0">
      <svg
        viewBox="-1 -1 102 102"
        className="w-full"
        role="img"
        aria-labelledby={`${id}-titulo`}
      >
        {/* String única: nós de texto adjacentes dentro de <title> divergem
            entre servidor e cliente e quebram a hidratação. */}
        <title id={`${id}-titulo`}>
          {`Mapa de ${talhoes.length} talhões, sombreados pela perda em porcentagem da produtividade`}
        </title>

        {talhoes.map((t) => {
          const ativo = t.id === selecionado;
          const sev = classificarSeveridade(t.percentualPerda);
          const centro = t.poligono.reduce(
            (a, [x, y]) => [a[0] + x / 4, a[1] + y / 4],
            [0, 0],
          );

          return (
            <g
              key={t.id}
              onClick={() => aoSelecionar(t.id)}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  aoSelecionar(t.id);
                }
              }}
              aria-label={`${t.nome}, perda de ${pct(t.percentualPerda)}, severidade ${sev.rotulo}`}
            >
              <polygon
                points={t.poligono.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={corDaPerda(t.percentualPerda, maximo)}
                stroke={ativo ? 'var(--color-tinta)' : 'var(--color-papel-alto)'}
                strokeWidth={ativo ? 1.1 : 0.5}
                className="transition-[stroke-width,stroke] duration-200"
              />
              <text
                x={centro[0]}
                y={centro[1] - 1.2}
                textAnchor="middle"
                fontSize={3.1}
                className="dado pointer-events-none"
                fill={t.percentualPerda > maximo * 0.62 ? '#f7f3ec' : 'var(--color-tinta)'}
                fontWeight={ativo ? 600 : 400}
              >
                {t.id}
              </text>
              <text
                x={centro[0]}
                y={centro[1] + 2.8}
                textAnchor="middle"
                fontSize={3.4}
                className="dado pointer-events-none"
                fill={t.percentualPerda > maximo * 0.62 ? '#f7f3ec' : 'var(--color-tinta-media)'}
                fontWeight={600}
              >
                {num(t.percentualPerda, 1)}%
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rotulo">Perda</span>
          <span className="flex h-2.5 overflow-hidden rounded-sm">
            {RAMPA.map((c) => (
              <span key={c} className="h-full w-6" style={{ backgroundColor: c }} />
            ))}
          </span>
          <span className="dado text-[0.7rem] text-tinta-fraca">
            0 – {num(maximo, 1)}% da produtividade
          </span>
        </div>
        <p className="dado text-[0.72rem] text-tinta-fraca">
          clique num talhão para analisá-lo
        </p>
      </figcaption>
    </figure>
  );
}

export { corDaPerda };
