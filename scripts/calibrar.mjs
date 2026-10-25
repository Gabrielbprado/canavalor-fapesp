/**
 * Varredura dos parâmetros padrão do pipeline contra as cenas sintéticas.
 *
 * Roda fora da aplicação, por decisão: calibrar é uma etapa de engenharia, não
 * um comportamento do produto. Os valores vencedores são copiados à mão para
 * PARAMETROS_PADRAO, com o resultado registrado no comentário — para que
 * ninguém tenha de adivinhar depois de onde saíram.
 *
 *   npx vite-node scripts/calibrar.mjs
 */

import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { PARAMETROS_MASSA_PADRAO } from '../src/lib/cv/classificador.ts';
import { consolidarParcela } from '../src/lib/cv/extrapolar.ts';
import { prepararImagem, processar } from '../src/lib/cv/pipeline.ts';
import { PARAMETROS_PADRAO } from '../src/lib/cv/tipos.ts';

const CENAS = ['baixa', 'media', 'alta', 'critica'];

const dados = CENAS.map((c) => {
  const gt = JSON.parse(readFileSync(`public/samples/talhao-${c}.gt.json`, 'utf8'));
  const png = PNG.sync.read(readFileSync(`public/samples/talhao-${c}.png`));
  return {
    c,
    gt,
    img: {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
      colorSpace: 'srgb',
    },
  };
});

// O primeiro estágio só depende do peso da luminância; cacheá-lo por peso evita
// refazer a conversão de cor em cada uma das centenas de combinações.
const contextos = new Map();
const contextoDe = (d, peso) => {
  const k = `${d.c}:${peso}`;
  if (!contextos.has(k)) contextos.set(k, prepararImagem(d.img, d.gt.cena.cm_por_px, peso));
  return contextos.get(k);
};

const grade = {
  pesoLuminancia: [0.55, 0.6, 0.65],
  desvioLimiar: [-12, -6, 0, 6, 12],
  fracaoHisterese: [0.4, 0.5, 0.6],
  raioFechamento: [2, 3, 4],
  fracaoMaximaObjeto: [0.04, 0.06, 0.09],
};

const combinacoes = [];
for (const pesoLuminancia of grade.pesoLuminancia)
  for (const desvioLimiar of grade.desvioLimiar)
    for (const fracaoHisterese of grade.fracaoHisterese)
      for (const raioFechamento of grade.raioFechamento)
        for (const fracaoMaximaObjeto of grade.fracaoMaximaObjeto)
          combinacoes.push({
            pesoLuminancia,
            desvioLimiar,
            fracaoHisterese,
            raioFechamento,
            fracaoMaximaObjeto,
          });

const resultados = [];
for (const combo of combinacoes) {
  const p = { ...PARAMETROS_PADRAO, ...combo };
  const erros = [];
  const deteccoes = [];

  for (const d of dados) {
    const r = processar(contextoDe(d, combo.pesoLuminancia), p, PARAMETROS_MASSA_PADRAO);
    const parcela = consolidarParcela(
      r.deteccoes,
      d.gt.cena.area_m2,
      d.gt.referencia.produtividade_t_ha,
    );
    erros.push(
      (Math.abs(parcela.massaTotalKg - d.gt.real.massa_total_kg) / d.gt.real.massa_total_kg) * 100,
    );
    deteccoes.push(r.deteccoes.length);
  }

  const medio = erros.reduce((a, b) => a + b, 0) / erros.length;
  const pior = Math.max(...erros);

  // A contagem entra no critério, e não por perfeccionismo: um ajuste que deixa
  // o limiar cair pega palha como fragmento, infla a contagem e ainda assim
  // pode acertar a massa total por compensação de erros. Esse acerto é falso —
  // a contagem por classe é o que alimenta os fatores de ATR diferenciados, que
  // são a contribuição central do projeto.
  const erroContagem =
    dados.reduce(
      (s, d, i) =>
        s + Math.abs(deteccoes[i] - d.gt.real.contagem_total) / d.gt.real.contagem_total,
      0,
    ) / dados.length * 100;

  resultados.push({
    ...combo,
    medio,
    pior,
    erros,
    deteccoes,
    erroContagem,
    escore: medio + pior * 0.5 + erroContagem * 0.8,
  });
}

resultados.sort((a, b) => a.escore - b.escore);

console.log('peso  desv  hist  rF   fmo  |  massa   pior  contagem | por cena                | detecções');
console.log('─'.repeat(104));
for (const r of resultados.slice(0, 10)) {
  console.log(
    `${r.pesoLuminancia.toFixed(2)}  ${String(r.desvioLimiar).padStart(4)}  ` +
      `${r.fracaoHisterese.toFixed(2)}  ${r.raioFechamento}  ${r.fracaoMaximaObjeto.toFixed(2)} | ` +
      `${r.medio.toFixed(1).padStart(6)}% ${r.pior.toFixed(1).padStart(5)}% ${r.erroContagem.toFixed(1).padStart(8)}% | ` +
      `${r.erros.map((e) => e.toFixed(1).padStart(5)).join(' ')} | ${r.deteccoes.join(' ')}`,
  );
}

const atual = resultados.find(
  (r) =>
    r.pesoLuminancia === PARAMETROS_PADRAO.pesoLuminancia &&
    r.desvioLimiar === PARAMETROS_PADRAO.desvioLimiar &&
    r.fracaoHisterese === PARAMETROS_PADRAO.fracaoHisterese &&
    r.raioFechamento === PARAMETROS_PADRAO.raioFechamento &&
    r.fracaoMaximaObjeto === PARAMETROS_PADRAO.fracaoMaximaObjeto,
);
if (atual) {
  console.log(
    `\npadrão atual: médio ${atual.medio.toFixed(1)}% · pior ${atual.pior.toFixed(1)}% · ` +
      `[${atual.erros.map((e) => e.toFixed(1)).join(' ')}]`,
  );
}
console.log(`\nfragmentos reais por cena: ${dados.map((d) => d.gt.real.contagem_total).join(' ')}`);
console.log(`combinações avaliadas: ${resultados.length}`);
