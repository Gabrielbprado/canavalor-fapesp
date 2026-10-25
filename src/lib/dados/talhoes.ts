/**
 * Talhões da demonstração.
 *
 * DADOS SINTÉTICOS. Gerados com semente fixa a partir dos indicadores médios do
 * Centro-Sul (UNICA 2025/26). Nenhum número aqui pertence a uma usina real, e a
 * interface exibe esse aviso de forma permanente — atribuir perdas inventadas a
 * uma empresa identificável seria indefensável numa reunião.
 */

import { classificarSeveridade, CLASSES, type ClassePerda, MERCADO } from '../dominio';
import { mulberry32 } from '../simulacao/prng';

export interface Talhao {
  id: string;
  nome: string;
  areaHa: number;
  produtividadeTHa: number;
  atrKgT: number;
  /** Perda visível medida, em kg/ha, distribuída por classe. */
  perdaPorClasseKgHa: Record<ClassePerda, number>;
  perdaTotalKgHa: number;
  percentualPerda: number;
  variedade: string;
  corte: number;
  colhedora: string;
  dataColheita: string;
  /** Polígono em coordenadas do mapa, 0..100 nos dois eixos. */
  poligono: [number, number][];
}

const VARIEDADES = ['RB86-7515', 'CTC-4', 'RB96-6928', 'SP80-1816', 'CTC-9001', 'RB92-579'];
const COLHEDORAS = ['CH570', 'A8810', 'CH950', 'A8800'];

/** Composição típica da massa perdida, por classe. */
const COMPOSICAO: Record<ClassePerda, number> = {
  inteira: 0.26,
  tolete: 0.38,
  toco: 0.16,
  ponta: 0.15,
  lasca: 0.05,
};

/**
 * Malha de talhões: 4 colunas × 3 linhas, com os vértices deslocados por ruído
 * determinístico. Talhão retangular perfeito não existe em campo, e um mosaico
 * regular demais denuncia o dado como fabricado — o que ele é, mas o realismo
 * da forma ajuda a leitura do mapa.
 */
function construirMalha(aleatorio: () => number): [number, number][][] {
  const colunas = 4;
  const linhas = 3;
  const larguraCel = 100 / colunas;
  const alturaCel = 100 / linhas;
  const ruido = 3.2;

  // Vértices compartilhados entre células vizinhas, para que não haja frestas
  const vertices: [number, number][][] = [];
  for (let l = 0; l <= linhas; l++) {
    const fila: [number, number][] = [];
    for (let c = 0; c <= colunas; c++) {
      const borda = l === 0 || l === linhas || c === 0 || c === colunas;
      const dx = borda ? 0 : (aleatorio() - 0.5) * ruido * 2;
      const dy = borda ? 0 : (aleatorio() - 0.5) * ruido * 2;
      fila.push([c * larguraCel + dx, l * alturaCel + dy]);
    }
    vertices.push(fila);
  }

  const poligonos: [number, number][][] = [];
  for (let l = 0; l < linhas; l++) {
    for (let c = 0; c < colunas; c++) {
      poligonos.push([
        vertices[l][c],
        vertices[l][c + 1],
        vertices[l + 1][c + 1],
        vertices[l + 1][c],
      ]);
    }
  }
  return poligonos;
}

function gerar(): Talhao[] {
  const aleatorio = mulberry32(20260901);
  const poligonos = construirMalha(aleatorio);

  // Percentuais escolhidos para cobrir as três faixas da escala CTC
  const percentuais = [1.4, 2.2, 2.8, 3.1, 3.6, 4.1, 4.4, 4.9, 5.3, 5.8, 6.4, 7.2];
  const embaralhados = [...percentuais];
  for (let i = embaralhados.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [embaralhados[i], embaralhados[j]] = [embaralhados[j], embaralhados[i]];
  }

  return poligonos.map((poligono, i) => {
    const percentual = embaralhados[i];
    // Arredondado antes de derivar a perda: se a produtividade for arredondada
    // depois, o percentual exibido deixa de bater com os quilos exibidos.
    const produtividade = Math.round(MERCADO.produtividadeTHa * (0.86 + aleatorio() * 0.28) * 10) / 10;
    const atr = Math.round(MERCADO.atrMedioKgT * (0.93 + aleatorio() * 0.14) * 100) / 100;
    const perdaTotal = (produtividade * 1000 * percentual) / 100;

    const perdaPorClasse = Object.fromEntries(
      CLASSES.map((c) => [c, perdaTotal * COMPOSICAO[c] * (0.85 + aleatorio() * 0.3)]),
    ) as Record<ClassePerda, number>;

    // Renormaliza para que a soma reproduza exatamente o percentual alvo
    const soma = CLASSES.reduce((s, c) => s + perdaPorClasse[c], 0);
    for (const c of CLASSES) perdaPorClasse[c] = (perdaPorClasse[c] / soma) * perdaTotal;

    const dia = 3 + Math.floor(aleatorio() * 25);
    const mes = 5 + Math.floor(aleatorio() * 4);

    return {
      id: `T-${String(i + 1).padStart(2, '0')}`,
      nome: `Talhão T-${String(i + 1).padStart(2, '0')}`,
      areaHa: Math.round((18 + aleatorio() * 42) * 10) / 10,
      produtividadeTHa: produtividade,
      atrKgT: atr,
      perdaPorClasseKgHa: perdaPorClasse,
      perdaTotalKgHa: perdaTotal,
      percentualPerda: percentual,
      variedade: VARIEDADES[Math.floor(aleatorio() * VARIEDADES.length)],
      corte: 1 + Math.floor(aleatorio() * 5),
      colhedora: COLHEDORAS[Math.floor(aleatorio() * COLHEDORAS.length)],
      dataColheita: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/2026`,
      poligono,
    };
  });
}

export const TALHOES: Talhao[] = gerar();

export const UNIDADE = {
  nome: 'Unidade Piloto',
  safra: '2026/27',
  areaTotalHa: TALHOES.reduce((s, t) => s + t.areaHa, 0),
} as const;

export function talhao(id: string): Talhao {
  const t = TALHOES.find((x) => x.id === id);
  if (!t) throw new Error(`Talhão desconhecido: ${id}`);
  return t;
}

export function severidadeDoTalhao(t: Talhao) {
  return classificarSeveridade(t.percentualPerda);
}
