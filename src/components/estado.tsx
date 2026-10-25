'use client';

/**
 * Estado compartilhado entre as camadas.
 *
 * A demonstração é uma cadeia contínua: escolhe-se o talhão no painel, mede-se
 * a perda na tela de visão, o motor a converte em reais e a simulação a projeta
 * como intervalo. Sem um estado comum, cada tela recomeçaria do zero e a
 * narrativa se perderia.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { PARAMETROS_MASSA_PADRAO, type ParametrosMassa } from '../lib/cv/classificador';
import type { ResultadoParcela } from '../lib/cv/extrapolar';
import { PARAMETROS_PADRAO, type ParametrosSegmentacao } from '../lib/cv/tipos';
import { VERSAO_PADRAO, type VersaoManual } from '../lib/consecana/versoes';
import { PERDA_INVISIVEL, type ClassePerda, PERFIS, CLASSES } from '../lib/dominio';
import { TALHOES, type Talhao } from '../lib/dados/talhoes';

export interface Laboratorio {
  pc: number;
  pureza: number;
  fibra: number;
}

interface Estudo {
  talhao: Talhao;
  definirTalhao: (id: string) => void;

  laboratorio: Laboratorio;
  definirLaboratorio: (l: Partial<Laboratorio>) => void;

  versao: VersaoManual;
  definirVersao: (v: VersaoManual) => void;

  precoKgAtr: number;
  definirPrecoKgAtr: (v: number) => void;

  fatoresAtr: Record<ClassePerda, number>;
  definirFatorAtr: (c: ClassePerda, v: number) => void;
  restaurarFatoresAtr: () => void;

  incluirInvisivel: boolean;
  definirIncluirInvisivel: (v: boolean) => void;
  razaoInvisivel: number;
  definirRazaoInvisivel: (v: number) => void;

  parametrosCv: ParametrosSegmentacao;
  definirParametrosCv: (p: Partial<ParametrosSegmentacao>) => void;
  restaurarParametrosCv: () => void;

  parametrosMassa: ParametrosMassa;
  definirParametrosMassa: (p: Partial<ParametrosMassa>) => void;

  /** Resultado da última análise de imagem, se houver. */
  parcela: ResultadoParcela | null;
  definirParcela: (p: ResultadoParcela | null) => void;
  /** Quando verdadeiro, o motor usa a medição por imagem em vez do dado do talhão. */
  usarMedicao: boolean;
  definirUsarMedicao: (v: boolean) => void;

  /** Dispositivo normativo aberto no painel lateral. */
  auditoria: string | null;
  abrirAuditoria: (id: string | null) => void;
}

const Contexto = createContext<Estudo | null>(null);

const fatoresIniciais = () =>
  Object.fromEntries(CLASSES.map((c) => [c, PERFIS[c].fatorAtr])) as Record<ClassePerda, number>;

export function ProvedorEstudo({ children }: { children: ReactNode }) {
  const [talhao, setTalhao] = useState<Talhao>(TALHOES[6]);
  const [laboratorio, setLaboratorio] = useState<Laboratorio>({
    pc: 14.8044,
    pureza: 87.13,
    fibra: 12.53,
  });
  const [versao, setVersao] = useState<VersaoManual>(VERSAO_PADRAO);
  const [precoKgAtr, setPrecoKgAtr] = useState(VERSAO_PADRAO.precoReferencia);
  const [fatoresAtr, setFatoresAtr] = useState<Record<ClassePerda, number>>(fatoresIniciais);
  const [incluirInvisivel, setIncluirInvisivel] = useState(false);
  const [razaoInvisivel, setRazaoInvisivel] = useState<number>(PERDA_INVISIVEL.razaoSobreVisivel);
  const [parametrosCv, setParametrosCv] = useState<ParametrosSegmentacao>(PARAMETROS_PADRAO);
  const [parametrosMassa, setParametrosMassa] = useState<ParametrosMassa>(PARAMETROS_MASSA_PADRAO);
  const [parcela, setParcela] = useState<ResultadoParcela | null>(null);
  const [usarMedicao, setUsarMedicao] = useState(false);
  const [auditoria, setAuditoria] = useState<string | null>(null);

  const valor = useMemo<Estudo>(
    () => ({
      talhao,
      definirTalhao: (id) => {
        const t = TALHOES.find((x) => x.id === id);
        if (t) setTalhao(t);
      },
      laboratorio,
      definirLaboratorio: (l) => setLaboratorio((atual) => ({ ...atual, ...l })),
      versao,
      definirVersao: (v) => {
        setVersao(v);
        // Trocar a versão do Manual também troca o preço de referência: manter
        // o preço da 5ª edição sob a revisão de 2026 produziria um número que
        // não corresponde a safra nenhuma.
        setPrecoKgAtr(v.precoReferencia);
      },
      precoKgAtr,
      definirPrecoKgAtr: setPrecoKgAtr,
      fatoresAtr,
      definirFatorAtr: (c, v) => setFatoresAtr((atual) => ({ ...atual, [c]: v })),
      restaurarFatoresAtr: () => setFatoresAtr(fatoresIniciais()),
      incluirInvisivel,
      definirIncluirInvisivel: setIncluirInvisivel,
      razaoInvisivel,
      definirRazaoInvisivel: setRazaoInvisivel,
      parametrosCv,
      definirParametrosCv: (p) => setParametrosCv((atual) => ({ ...atual, ...p })),
      restaurarParametrosCv: () => setParametrosCv(PARAMETROS_PADRAO),
      parametrosMassa,
      definirParametrosMassa: (p) => setParametrosMassa((atual) => ({ ...atual, ...p })),
      parcela,
      definirParcela: setParcela,
      usarMedicao,
      definirUsarMedicao: setUsarMedicao,
      auditoria,
      abrirAuditoria: setAuditoria,
    }),
    [
      talhao,
      laboratorio,
      versao,
      precoKgAtr,
      fatoresAtr,
      incluirInvisivel,
      razaoInvisivel,
      parametrosCv,
      parametrosMassa,
      parcela,
      usarMedicao,
      auditoria,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstudo(): Estudo {
  const c = useContext(Contexto);
  if (!c) throw new Error('useEstudo precisa estar dentro de ProvedorEstudo');
  return c;
}
