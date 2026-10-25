/**
 * Elo perda física → ATR perdido → remuneração perdida.
 *
 * É a contribuição central do CanaValor: o setor mede a perda em % de massa; o
 * produtor é remunerado por kg de ATR. Esta camada faz a tradução, atribuindo à
 * cana perdida o ATR de referência do próprio talhão, ponderado por um fator
 * diferenciado por classe — declarado no projeto como hipótese parametrizável.
 */

import { type Calculo, num } from '../auditoria/trilha';
import {
  CLASSES,
  type ClassePerda,
  MERCADO,
  PERDA_INVISIVEL,
  PERFIS,
  classificarSeveridade,
} from '../dominio';

export interface EntradaPerdas {
  /** Massa perdida por classe, em kg/ha. */
  perdaPorClasseKgHa: Record<ClassePerda, number>;
  /** ATR de referência do talhão, em kg/t. */
  atrTalhaoKgT: number;
  /** Produtividade do talhão, em t/ha. */
  produtividadeTHa: number;
  precoKgAtr: number;
  /** Componente fora da fórmula de referência (ex.: 0,045 na revisão 2026). */
  fatorAdicional: number;
  /** Fatores de ATR por classe; permite sobrepor os valores iniciais. */
  fatoresAtr?: Partial<Record<ClassePerda, number>>;
  /** Incluir a estimativa de perda invisível como linha separada. */
  incluirInvisivel: boolean;
  razaoInvisivel?: number;
}

export interface LinhaPerda {
  classe: ClassePerda | 'invisivel';
  rotulo: string;
  cor: string;
  perdaKgHa: number;
  fatorAtr: number;
  atrPerdidoKgHa: number;
  reaisPorHa: number;
  /** Linha estimada indiretamente, nunca somada em silêncio à perda medida. */
  estimada: boolean;
  ref: string;
}

export interface ResultadoPerdas {
  linhas: LinhaPerda[];
  /** Perda física medida pela visão computacional. */
  perdaVisivelKgHa: number;
  perdaInvisivelKgHa: number;
  perdaTotalKgHa: number;
  /** Perda visível como % da produtividade — é o número que o setor usa. */
  percentualVisivel: number;
  percentualTotal: number;
  severidade: ReturnType<typeof classificarSeveridade>;
  atrPerdidoKgHa: number;
  reaisPorHaVisivel: number;
  reaisPorHaTotal: number;
  /** Perda expressa em R$ por tonelada efetivamente entregue. */
  reaisPorToneladaEntregue: number;
}

export function calcularPerdas(e: EntradaPerdas): ResultadoPerdas {
  const razao = e.razaoInvisivel ?? PERDA_INVISIVEL.razaoSobreVisivel;
  const multiplicador = 1 + e.fatorAdicional;

  const linhas: LinhaPerda[] = CLASSES.map((classe) => {
    const perfil = PERFIS[classe];
    const fatorAtr = e.fatoresAtr?.[classe] ?? perfil.fatorAtr;
    const perdaKgHa = e.perdaPorClasseKgHa[classe] ?? 0;

    // kg/ha → t/ha → kg de ATR/ha, ponderado pelo fator da classe
    const atrPerdidoKgHa = (perdaKgHa / 1000) * e.atrTalhaoKgT * fatorAtr;

    return {
      classe,
      rotulo: perfil.rotulo,
      cor: perfil.cor,
      perdaKgHa,
      fatorAtr,
      atrPerdidoKgHa,
      reaisPorHa: atrPerdidoKgHa * e.precoKgAtr * multiplicador,
      estimada: false,
      ref: 'hipotese.fator-atr-classe',
    };
  });

  const perdaVisivelKgHa = linhas.reduce((s, l) => s + l.perdaKgHa, 0);
  const perdaInvisivelKgHa = e.incluirInvisivel ? perdaVisivelKgHa * razao : 0;

  if (e.incluirInvisivel) {
    const atrPerdidoKgHa =
      (perdaInvisivelKgHa / 1000) * e.atrTalhaoKgT * PERDA_INVISIVEL.fatorAtr;
    linhas.push({
      classe: 'invisivel',
      rotulo: 'Perda invisível (estimada)',
      cor: '#7a7a8c',
      perdaKgHa: perdaInvisivelKgHa,
      fatorAtr: PERDA_INVISIVEL.fatorAtr,
      atrPerdidoKgHa,
      reaisPorHa: atrPerdidoKgHa * e.precoKgAtr * multiplicador,
      estimada: true,
      ref: PERDA_INVISIVEL.ref,
    });
  }

  const perdaTotalKgHa = perdaVisivelKgHa + perdaInvisivelKgHa;
  const produtividadeKgHa = e.produtividadeTHa * 1000;

  const reaisPorHaVisivel = linhas
    .filter((l) => !l.estimada)
    .reduce((s, l) => s + l.reaisPorHa, 0);
  const reaisPorHaTotal = linhas.reduce((s, l) => s + l.reaisPorHa, 0);
  const percentualVisivel = (perdaVisivelKgHa / produtividadeKgHa) * 100;

  return {
    linhas,
    perdaVisivelKgHa,
    perdaInvisivelKgHa,
    perdaTotalKgHa,
    percentualVisivel,
    percentualTotal: (perdaTotalKgHa / produtividadeKgHa) * 100,
    severidade: classificarSeveridade(percentualVisivel),
    atrPerdidoKgHa: linhas.reduce((s, l) => s + l.atrPerdidoKgHa, 0),
    reaisPorHaVisivel,
    reaisPorHaTotal,
    reaisPorToneladaEntregue: reaisPorHaTotal / e.produtividadeTHa,
  };
}

/** Trilha de auditoria para uma única classe, exibida no painel lateral. */
export function trilhaClasse(
  classe: ClassePerda,
  perdaKgHa: number,
  atrTalhaoKgT: number,
  fatorAtr: number,
  precoKgAtr: number,
  fatorAdicional: number,
): Calculo {
  const toneladas = perdaKgHa / 1000;
  const atrPerdido = toneladas * atrTalhaoKgT * fatorAtr;
  const reais = atrPerdido * precoKgAtr * (1 + fatorAdicional);

  return {
    valor: reais,
    unidade: 'R$/ha',
    ref: 'hipotese.fator-atr-classe',
    passos: [
      {
        rotulo: 'Massa perdida',
        formula: 'perda (kg/ha) ÷ 1000',
        substituido: `${num(perdaKgHa, 1)} ÷ 1000`,
        valor: toneladas,
        unidade: 't/ha',
        ref: 'hipotese.massa-classe',
      },
      {
        rotulo: 'ATR perdido',
        formula: 'massa (t/ha) × ATR do talhão × fator da classe',
        substituido: `${num(toneladas, 4)} × ${num(atrTalhaoKgT, 2)} × ${num(fatorAtr, 2)}`,
        valor: atrPerdido,
        unidade: 'kg ATR/ha',
        ref: 'hipotese.fator-atr-classe',
      },
      {
        rotulo: 'Remuneração perdida',
        formula: 'ATR perdido × preço do kg de ATR × (1 + fator adicional)',
        substituido: `${num(atrPerdido, 3)} × ${num(precoKgAtr, 4)} × ${num(1 + fatorAdicional, 3)}`,
        valor: reais,
        unidade: 'R$/ha',
        ref: 'consecana.valor-tonelada',
      },
    ],
  };
}

/** Perda em R$/ha equivalente a X% da produtividade — útil para o dashboard. */
export function perdaEquivalente(
  percentual: number,
  produtividadeTHa = MERCADO.produtividadeTHa,
  atrKgT = MERCADO.atrMedioKgT,
  precoKgAtr = MERCADO.precoAtrProjetado,
): number {
  return ((produtividadeTHa * percentual) / 100) * atrKgT * precoKgAtr;
}
