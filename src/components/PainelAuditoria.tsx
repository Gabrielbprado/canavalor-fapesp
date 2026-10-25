'use client';

/**
 * Painel lateral de auditoria normativa.
 *
 * Materializa o objetivo específico do projeto de "associar cada cálculo ao
 * trecho do Manual que o originou". Aqui o índice é local e estático; na Fase 4
 * ele é substituído por recuperação em base vetorial.
 */

import { useEffect } from 'react';
import { DISPOSITIVOS } from '../lib/auditoria/dispositivos';
import { useEstudo } from './estado';

export function PainelAuditoria() {
  const { auditoria, abrirAuditoria } = useEstudo();
  const d = auditoria ? DISPOSITIVOS[auditoria] : null;

  useEffect(() => {
    if (!d) return;
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && abrirAuditoria(null);
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [d, abrirAuditoria]);

  if (!d) return null;

  const indexado = d.status === 'verificado';

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-tinta/25 backdrop-blur-[2px]"
        onClick={() => abrirAuditoria(null)}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Fundamento normativo"
        className="surgir fixed right-0 top-0 z-50 flex h-full w-full max-w-[26rem] flex-col border-l border-linha-forte bg-papel-alto shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-linha px-6 py-4">
          <div>
            <p className="rotulo">Fundamento normativo</p>
            <p className="dado mt-0.5 text-[0.7rem] text-tinta-fraca">{d.id}</p>
          </div>
          <button
            onClick={() => abrirAuditoria(null)}
            className="-mr-1 -mt-1 rounded px-2 py-1 text-tinta-fraca transition-colors hover:bg-papel-fundo hover:text-tinta"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <h2 className="font-display text-lg font-semibold leading-snug text-tinta">
              {d.dispositivo}
            </h2>
            <p className="mt-1.5 text-[0.82rem] text-tinta-media">
              {d.norma} · {d.versao}
            </p>
          </div>

          {d.formula && (
            <div className="border-l-2 border-palha bg-papel-fundo/60 px-4 py-3">
              <p className="rotulo mb-1.5">Fórmula</p>
              <p className="dado text-[0.86rem] leading-relaxed text-tinta">{d.formula}</p>
            </div>
          )}

          {indexado ? (
            <div>
              <p className="rotulo mb-1.5">Transcrição</p>
              <blockquote className="border-l-2 border-linha-forte pl-4 text-[0.88rem] leading-relaxed text-tinta-media">
                {d.texto}
              </blockquote>
            </div>
          ) : (
            <div className="border border-dashed border-linha-forte bg-papel-fundo/50 px-4 py-4">
              <p className="rotulo !text-solo">Trecho a indexar</p>
              <p className="mt-2 text-[0.84rem] leading-relaxed text-tinta-media">
                O dispositivo existe no Manual, mas a fonte primária ainda não foi indexada por
                este protótipo. O texto não é reproduzido aqui porque redigi-lo por inferência
                seria fabricar citação normativa.
              </p>
              <p className="mt-2.5 text-[0.8rem] leading-relaxed text-tinta-fraca">
                Na Fase 4 do projeto, esta lacuna é preenchida pela recuperação do trecho em base
                vetorial, a partir do PDF do Manual.
              </p>
            </div>
          )}

          <div>
            <p className="rotulo mb-1">Fonte</p>
            <p className="text-[0.84rem] leading-relaxed text-tinta-media">{d.fonte}</p>
          </div>
        </div>

        <div className="border-t border-linha px-6 py-3">
          <p className="text-[0.74rem] leading-relaxed text-tinta-fraca">
            Pressione <kbd className="dado text-tinta-media">Esc</kbd> para fechar. Todo valor
            marcado com <span className="dado text-palha">§</span> abre o dispositivo que o
            fundamenta.
          </p>
        </div>
      </aside>
    </>
  );
}
