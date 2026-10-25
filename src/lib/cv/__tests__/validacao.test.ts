/**
 * Valida o pipeline de visão contra o ground truth das cenas sintéticas.
 *
 * A massa verdadeira foi gerada por um modelo cilíndrico com densidade e
 * diâmetro sorteados por fragmento — deliberadamente diferente do modelo de
 * densidade superficial que o estimador usa. Sem essa separação, o erro medido
 * tenderia a zero por construção e o teste não significaria nada.
 *
 * Meta declarada no projeto: erro absoluto médio da massa por parcela <= 15%.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { PARAMETROS_MASSA_PADRAO } from '../classificador';
import { consolidarParcela } from '../extrapolar';
import { prepararImagem, processar } from '../pipeline';
import { PARAMETROS_PADRAO } from '../tipos';

const DIR = join(process.cwd(), 'public', 'samples');
const CENAS = ['baixa', 'media', 'alta', 'critica'] as const;

interface GroundTruth {
  cena: { px_por_cm: number; cm_por_px: number; area_m2: number; largura_px: number };
  referencia: { produtividade_t_ha: number };
  real: { massa_total_kg: number; perda_pct_efetiva: number; contagem_total: number };
}

function carregar(cena: string) {
  const gt: GroundTruth = JSON.parse(
    readFileSync(join(DIR, `talhao-${cena}.gt.json`), 'utf8'),
  );
  const png = PNG.sync.read(readFileSync(join(DIR, `talhao-${cena}.png`)));
  const imagem = {
    width: png.width,
    height: png.height,
    data: new Uint8ClampedArray(png.data),
    colorSpace: 'srgb',
  } as ImageData;
  return { gt, imagem };
}

function analisar(cena: string) {
  const { gt, imagem } = carregar(cena);
  const ctx = prepararImagem(imagem, gt.cena.cm_por_px, PARAMETROS_PADRAO.pesoLuminancia);
  const r = processar(ctx, PARAMETROS_PADRAO, PARAMETROS_MASSA_PADRAO);
  const parcela = consolidarParcela(
    r.deteccoes,
    gt.cena.area_m2,
    gt.referencia.produtividade_t_ha,
  );
  const erroPct =
    (Math.abs(parcela.massaTotalKg - gt.real.massa_total_kg) / gt.real.massa_total_kg) * 100;
  return { gt, r, parcela, erroPct };
}

describe('Pipeline de visão sobre as cenas sintéticas', () => {
  const resultados = CENAS.map((c) => ({ cena: c, ...analisar(c) }));

  it.each(resultados)('$cena — detecta fragmentos e produz massa positiva', (res) => {
    expect(res.r.deteccoes.length).toBeGreaterThan(0);
    expect(res.parcela.massaTotalKg).toBeGreaterThan(0);
  });

  it('a perda estimada cresce junto com a severidade das cenas', () => {
    const pcts = resultados.map((r) => r.parcela.percentual);
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThan(pcts[i - 1]);
  });

  it('a perda estimada acompanha a real em cada cena', () => {
    for (const r of resultados) {
      // Tolerância de 2 pontos percentuais sobre a perda; é a grandeza que
      // decide a faixa de severidade CTC.
      expect(Math.abs(r.parcela.percentual - r.gt.real.perda_pct_efetiva)).toBeLessThan(2);
    }
  });

  it('erro absoluto médio da massa fica dentro da meta de 15%', () => {
    const erros = resultados.map((r) => r.erroPct);
    const medio = erros.reduce((a, b) => a + b, 0) / erros.length;

    const linhas = resultados.map(
      (r) =>
        `  ${r.cena.padEnd(8)} real ${r.gt.real.massa_total_kg.toFixed(3)} kg ` +
        `(${r.gt.real.contagem_total} frag) | estimado ${r.parcela.massaTotalKg.toFixed(3)} kg ` +
        `(${r.r.deteccoes.length} det) | erro ${r.erroPct.toFixed(1)}% | ` +
        `perda ${r.gt.real.perda_pct_efetiva.toFixed(2)}% real vs ${r.parcela.percentual.toFixed(2)}% est`,
    );
    console.info(`\nValidação contra ground truth:\n${linhas.join('\n')}\n  erro médio: ${medio.toFixed(1)}%\n`);

    expect(medio).toBeLessThanOrEqual(15);
  });

  it('nenhuma cena isolada estoura o dobro da meta', () => {
    // A meta do projeto é sobre a média das parcelas. Ainda assim, uma parcela
    // isolada muito fora indicaria falha sistemática, não variabilidade.
    for (const r of resultados) expect(r.erroPct).toBeLessThan(35);
  });

  it('a contagem detectada fica na mesma ordem de grandeza da real', () => {
    for (const r of resultados) {
      expect(r.r.deteccoes.length).toBeGreaterThanOrEqual(r.gt.real.contagem_total * 0.5);
      expect(r.r.deteccoes.length).toBeLessThanOrEqual(r.gt.real.contagem_total * 1.6);
    }
  });
});

describe('Desempenho', () => {
  it('o estágio de sliders roda bem abaixo do orçamento interativo', () => {
    const { gt, imagem } = carregar('critica');
    const ctx = prepararImagem(imagem, gt.cena.cm_por_px, PARAMETROS_PADRAO.pesoLuminancia);

    const t0 = performance.now();
    for (let i = 0; i < 3; i++) processar(ctx, PARAMETROS_PADRAO, PARAMETROS_MASSA_PADRAO);
    const medio = (performance.now() - t0) / 3;

    console.info(`  processamento por slider: ${medio.toFixed(0)} ms em ${imagem.width}×${imagem.height}`);
    expect(medio).toBeLessThan(1500);
  });
});
