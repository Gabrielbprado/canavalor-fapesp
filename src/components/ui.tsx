'use client';

import type { ReactNode } from 'react';
import { num } from './formato';

export function Secao({
  numero,
  titulo,
  descricao,
  acao,
  children,
  className = '',
}: {
  numero?: string;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`cartao relative ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-b border-linha px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5">
            {numero && <span className="dado text-[0.7rem] font-semibold text-palha">{numero}</span>}
            <h2 className="font-display text-[1.05rem] font-semibold leading-tight text-tinta">
              {titulo}
            </h2>
          </div>
          {descricao && (
            <p className="mt-1 max-w-[62ch] text-[0.82rem] leading-relaxed text-tinta-media">
              {descricao}
            </p>
          )}
        </div>
        {acao && <div className="shrink-0">{acao}</div>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/** Número em destaque com rótulo e unidade. O valor é sempre monoespaçado. */
export function Metrica({
  rotulo,
  valor,
  unidade,
  detalhe,
  cor,
  tamanho = 'medio',
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  unidade?: string;
  detalhe?: ReactNode;
  cor?: string;
  tamanho?: 'medio' | 'grande';
}) {
  return (
    <div>
      <p className="rotulo">{rotulo}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`dado font-semibold leading-none ${tamanho === 'grande' ? 'text-[2.1rem]' : 'text-[1.4rem]'}`}
          style={cor ? { color: cor } : undefined}
        >
          {valor}
        </span>
        {unidade && <span className="text-[0.78rem] text-tinta-fraca">{unidade}</span>}
      </p>
      {detalhe && <p className="mt-1 text-[0.76rem] leading-snug text-tinta-fraca">{detalhe}</p>}
    </div>
  );
}

export function Campo({
  rotulo,
  valor,
  aoMudar,
  min,
  max,
  passo,
  unidade,
  sufixo,
}: {
  rotulo: ReactNode;
  valor: number;
  aoMudar: (v: number) => void;
  min: number;
  max: number;
  passo: number;
  unidade?: string;
  sufixo?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="rotulo flex items-center gap-1.5">
        {rotulo}
        {sufixo}
      </span>
      <span className="mt-1 flex items-baseline gap-2">
        <input
          type="number"
          value={valor}
          min={min}
          max={max}
          step={passo}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) aoMudar(v);
          }}
          className="dado w-full min-w-0 border-b border-linha-forte bg-transparent pb-1 text-[1.05rem] font-medium text-tinta outline-none transition-colors focus:border-palha"
        />
        {unidade && <span className="shrink-0 text-[0.75rem] text-tinta-fraca">{unidade}</span>}
      </span>
    </label>
  );
}

export function Deslizante({
  rotulo,
  valor,
  aoMudar,
  min,
  max,
  passo,
  formatar = (v: number) => v.toFixed(2),
  aviso,
}: {
  rotulo: ReactNode;
  valor: number;
  aoMudar: (v: number) => void;
  min: number;
  max: number;
  passo: number;
  formatar?: (v: number) => string;
  aviso?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="rotulo">{rotulo}</span>
        <span className="dado text-[0.82rem] font-medium text-tinta">{formatar(valor)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="mt-2 w-full"
      />
      {aviso && <span className="mt-1 block text-[0.72rem] leading-snug text-perda">{aviso}</span>}
    </label>
  );
}

export function Alternar({
  rotulo,
  ativo,
  aoMudar,
  descricao,
}: {
  rotulo: ReactNode;
  ativo: boolean;
  aoMudar: (v: boolean) => void;
  descricao?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={ativo}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-palha"
      />
      <span className="min-w-0">
        <span className="block text-[0.85rem] font-medium leading-tight text-tinta">{rotulo}</span>
        {descricao && (
          <span className="mt-0.5 block text-[0.76rem] leading-snug text-tinta-fraca">
            {descricao}
          </span>
        )}
      </span>
    </label>
  );
}

/** Barra de status da severidade CTC. Cor nunca sozinha: leva símbolo e rótulo. */
export function Severidade({
  severidade,
  percentual,
}: {
  severidade: { id: string; rotulo: string; cor: string; simbolo: string };
  percentual: number;
}) {
  return (
    <span
      className="dado inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[0.75rem] font-medium"
      style={{
        color: severidade.cor,
        borderColor: `${severidade.cor}55`,
        backgroundColor: `${severidade.cor}12`,
      }}
    >
      <span aria-hidden>{severidade.simbolo}</span>
      {severidade.rotulo} · {num(percentual, 2)}%
    </span>
  );
}
