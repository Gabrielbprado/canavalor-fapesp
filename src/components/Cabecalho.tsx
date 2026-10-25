'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UNIDADE } from '../lib/dados/talhoes';

const CAMADAS = [
  { href: '/', numero: '—', titulo: 'Painel', descricao: 'Visão da safra' },
  { href: '/aquisicao', numero: 'I', titulo: 'Visão', descricao: 'Perda física por classe' },
  { href: '/motor', numero: 'II', titulo: 'Motor', descricao: 'ATR e reais por hectare' },
  { href: '/simulacao', numero: 'III', titulo: 'Simulação', descricao: 'Remuneração como intervalo' },
  { href: '/auditoria', numero: '§', titulo: 'Auditoria', descricao: 'Índice normativo' },
];

export function Cabecalho() {
  const caminho = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-papel/92 backdrop-blur-md">
      {/* O aviso vem antes de tudo, e não sai da tela: nenhum número desta
          demonstração pode ser confundido com medição real. */}
      <div className="border-b border-perda/25 bg-perda/[0.07]">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2.5 px-5 py-1.5 lg:px-8">
          <span className="inline-block size-1.5 shrink-0 rounded-full bg-perda" />
          <p className="rotulo !text-perda !tracking-[0.16em]">
            Dados sintéticos · demonstração
          </p>
          <p className="hidden text-[0.7rem] text-tinta-fraca sm:block">
            Talhões, imagens e medições são gerados para esta apresentação. Não representam
            nenhuma usina real.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-x-8 gap-y-3 px-5 pb-0 pt-3.5 lg:px-8">
        <Link href="/" className="group shrink-0">
          <h1 className="font-display text-[1.65rem] font-semibold leading-none tracking-tight text-tinta">
            Cana<span className="text-palha">Valor</span>
          </h1>
          <p className="mt-1 text-[0.78rem] leading-tight text-tinta-media">
            Da perda física à remuneração perdida
          </p>
        </Link>

        <nav className="order-3 -mb-px flex w-full gap-0 overflow-x-auto lg:order-2 lg:w-auto">
          {CAMADAS.map((c) => {
            const ativo = caminho === c.href;
            return (
              <Link
                key={c.href}
                href={c.href}
                aria-current={ativo ? 'page' : undefined}
                className={`group relative flex shrink-0 items-baseline gap-2 border-b-2 px-3.5 py-2.5 transition-colors ${
                  ativo
                    ? 'border-palha text-tinta'
                    : 'border-transparent text-tinta-fraca hover:border-linha-forte hover:text-tinta-media'
                }`}
              >
                <span
                  className={`dado text-[0.68rem] font-semibold ${ativo ? 'text-palha' : 'text-linha-forte'}`}
                >
                  {c.numero}
                </span>
                <span className="text-[0.86rem] font-medium">{c.titulo}</span>
              </Link>
            );
          })}
        </nav>

        <div className="order-2 shrink-0 text-right lg:order-3">
          <p className="rotulo">{UNIDADE.nome}</p>
          <p className="dado text-[0.82rem] text-tinta-media">
            Safra {UNIDADE.safra} · {UNIDADE.areaTotalHa.toFixed(1)} ha
          </p>
        </div>
      </div>
    </header>
  );
}
