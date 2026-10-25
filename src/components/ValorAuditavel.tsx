'use client';

import type { ReactNode } from 'react';
import { useEstudo } from './estado';

/**
 * Envolve qualquer número exibido e o liga ao dispositivo que o fundamenta.
 *
 * É a peça que torna a auditabilidade visível em vez de prometida: o marcador §
 * aparece ao lado do valor e abre o painel com a fórmula, os valores
 * substituídos e a norma.
 */
export function ValorAuditavel({
  disp,
  children,
  titulo,
}: {
  /** Identificador do dispositivo em DISPOSITIVOS. Não se chama `ref`: React
   *  trata esse nome de forma especial e a prop não chegaria ao componente. */
  disp: string;
  children: ReactNode;
  titulo?: string;
}) {
  const { abrirAuditoria } = useEstudo();
  return (
    <button
      type="button"
      onClick={() => abrirAuditoria(disp)}
      title={titulo ?? 'Ver o fundamento normativo deste valor'}
      className="group inline-flex items-baseline gap-1 rounded-sm transition-colors hover:bg-palha/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-palha/60"
    >
      {children}
      <span className="dado select-none text-[0.7em] leading-none text-linha-forte transition-colors group-hover:text-palha">
        §
      </span>
    </button>
  );
}

const ESTILOS = {
  hipotese: 'border-solo/40 bg-solo/8 text-solo',
  parametro: 'border-agua/40 bg-agua/8 text-agua',
  arbitrado: 'border-linha-forte bg-papel-fundo text-tinta-media',
} as const;

/**
 * Selo que marca, na própria interface, o que é norma e o que é hipótese do
 * protótipo. Sem ele, um número arbitrado passa por medição.
 */
export function Selo({
  tipo,
  fase,
  className = '',
}: {
  tipo: keyof typeof ESTILOS;
  fase?: string;
  className?: string;
}) {
  const texto = tipo === 'hipotese' ? 'Hipótese' : tipo === 'parametro' ? 'Parâmetro' : 'Arbitrado';
  return (
    <span
      className={`dado inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-px text-[0.62rem] uppercase tracking-wider ${ESTILOS[tipo]} ${className}`}
    >
      {texto}
      {fase && <span className="opacity-70">· {fase}</span>}
    </span>
  );
}
