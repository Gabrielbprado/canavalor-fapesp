'use client';

import { useMemo, useState } from 'react';
import { listarDispositivos } from '../../lib/auditoria/dispositivos';
import { useEstudo } from '../../components/estado';
import { Secao } from '../../components/ui';

export default function PaginaAuditoria() {
  const { abrirAuditoria } = useEstudo();
  const [filtro, setFiltro] = useState('');

  const dispositivos = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    const lista = listarDispositivos();
    if (!termo) return lista;
    return lista.filter((d) =>
      [d.dispositivo, d.norma, d.texto ?? '', d.formula ?? '', d.fonte]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  }, [filtro]);

  const indexados = dispositivos.filter((d) => d.status === 'verificado');
  const pendentes = dispositivos.filter((d) => d.status === 'a-indexar');

  return (
    <div className="space-y-5">
      <div>
        <p className="rotulo">Auditabilidade normativa</p>
        <h1 className="font-display text-[1.9rem] font-semibold leading-tight text-tinta">
          Índice dos dispositivos
        </h1>
        <p className="mt-1 max-w-[82ch] text-[0.88rem] leading-relaxed text-tinta-media">
          O projeto se compromete a associar cada cálculo ao trecho do Manual que o originou. Aqui
          esse índice é local e estático; na Fase 4 ele passa a ser recuperado de uma base
          vetorial construída sobre o PDF da norma. A estrutura, essa já é a definitiva: todo
          número da interface carrega o identificador do dispositivo que o fundamenta.
        </p>
      </div>

      <div className="cartao border-l-[3px] border-l-solo px-5 py-3.5">
        <p className="text-[0.88rem] font-semibold text-tinta">
          O que este protótipo não faz — e por quê
        </p>
        <p className="mt-1.5 max-w-[92ch] text-[0.82rem] leading-relaxed text-tinta-media">
          Nenhum texto normativo foi redigido por inferência. Entram como transcrição apenas os
          trechos que constam literalmente dos documentos do projeto; os demais dispositivos
          existem no índice, mas sem texto, marcados como <strong>a indexar</strong>. Numa
          apresentação a uma agência de fomento, uma citação normativa fabricada custaria mais do
          que qualquer lacuna admitida.
        </p>
      </div>

      <label className="block max-w-md">
        <span className="rotulo">Buscar no índice</span>
        <input
          type="search"
          value={filtro}
          onChange={(ev) => setFiltro(ev.target.value)}
          placeholder="ATR, fibra, mix, retroativo…"
          className="mt-1 w-full border-b border-linha-forte bg-transparent pb-1.5 text-[0.95rem] text-tinta outline-none transition-colors placeholder:text-tinta-fraca focus:border-palha"
        />
      </label>

      <Secao
        titulo={`Dispositivos indexados · ${indexados.length}`}
        descricao="Transcrição verificável disponível. Todo valor da interface ligado a um destes abre o texto completo."
      >
        <ul className="divide-y divide-linha">
          {indexados.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => abrirAuditoria(d.id)}
                className="group w-full py-3 text-left transition-colors hover:bg-papel-fundo/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[0.9rem] font-medium text-tinta">{d.dispositivo}</span>
                  <span className="dado shrink-0 text-[0.68rem] text-tinta-fraca">{d.id}</span>
                </div>
                <p className="mt-0.5 text-[0.78rem] text-tinta-media">
                  {d.norma} · {d.versao}
                </p>
                {d.formula && (
                  <p className="dado mt-1.5 border-l-2 border-palha/60 pl-2.5 text-[0.76rem] text-tinta">
                    {d.formula}
                  </p>
                )}
                {d.texto && (
                  <p className="mt-1.5 line-clamp-2 max-w-[100ch] text-[0.78rem] leading-relaxed text-tinta-fraca">
                    {d.texto}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao
        titulo={`A indexar · ${pendentes.length}`}
        descricao="Dispositivos que existem no Manual, cuja fonte primária este protótipo ainda não tem. Ficam listados sem texto, deliberadamente."
      >
        <ul className="divide-y divide-linha">
          {pendentes.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => abrirAuditoria(d.id)}
                className="w-full py-3 text-left transition-colors hover:bg-papel-fundo/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[0.9rem] font-medium text-tinta-media">
                    {d.dispositivo}
                  </span>
                  <span className="dado shrink-0 rounded-sm border border-dashed border-linha-forte px-1.5 py-px text-[0.62rem] uppercase tracking-wider text-solo">
                    a indexar
                  </span>
                </div>
                <p className="mt-0.5 text-[0.78rem] text-tinta-fraca">
                  {d.norma} · {d.versao}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Secao>

      {dispositivos.length === 0 && (
        <p className="py-8 text-center text-[0.88rem] text-tinta-fraca">
          Nenhum dispositivo corresponde a “{filtro}”.
        </p>
      )}
    </div>
  );
}
