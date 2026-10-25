'use client';

/**
 * Imagem da parcela com a camada de detecções sobreposta.
 *
 * Três telas empilhadas: a foto, a máscara de segmentação e os retângulos
 * orientados. Separá-las é o que permite destacar um fragmento ao passar o
 * mouse sem redesenhar a imagem inteira a cada quadro.
 */

import { useEffect, useRef } from 'react';
import { PERFIS, type ClassePerda } from '../../lib/dominio';
import type { Deteccao, ResultadoPipeline } from '../../lib/cv/tipos';

const COR_AGREGADO = '#7a7062';

function corDe(classe: Deteccao['classe']): string {
  if (classe === 'agregado' || classe === 'rejeitado') return COR_AGREGADO;
  return PERFIS[classe as ClassePerda].cor;
}

function rotuloDe(classe: Deteccao['classe']): string {
  if (classe === 'agregado') return 'Agregado';
  if (classe === 'rejeitado') return 'Rejeitado';
  return PERFIS[classe as ClassePerda].rotulo;
}

export type ModoMascara = 'oculta' | 'preenchida' | 'binaria';

export function Lente({
  bitmap,
  resultado,
  modoMascara,
  mostrarRotulos,
  destacado,
  aoDestacar,
  cmPorPxOriginal,
}: {
  bitmap: ImageBitmap;
  resultado: ResultadoPipeline | null;
  modoMascara: ModoMascara;
  mostrarRotulos: boolean;
  destacado: number | null;
  aoDestacar: (id: number | null) => void;
  cmPorPxOriginal: number | null;
}) {
  const base = useRef<HTMLCanvasElement>(null);
  const mascara = useRef<HTMLCanvasElement>(null);
  const marcas = useRef<HTMLCanvasElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  // --- Fotografia ---
  useEffect(() => {
    const c = base.current;
    if (!c) return;
    c.width = bitmap.width;
    c.height = bitmap.height;
    c.getContext('2d')?.drawImage(bitmap, 0, 0);
  }, [bitmap]);

  // --- Máscara de segmentação ---
  useEffect(() => {
    const c = mascara.current;
    if (!c || !resultado) return;
    const { larguraProc: lp, alturaProc: ap, rotulos, manter, deteccoes } = resultado;

    c.width = lp;
    c.height = ap;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, lp, ap);
    if (modoMascara === 'oculta') return;

    const classePorRotulo = new Map<number, Deteccao['classe']>();
    for (const d of deteccoes) classePorRotulo.set(d.id, d.classe);

    const img = ctx.createImageData(lp, ap);
    const dados = img.data;
    const cache = new Map<string, [number, number, number]>();

    for (let i = 0; i < lp * ap; i++) {
      const r = rotulos[i];
      if (!r || !manter[r]) continue;

      const o = i * 4;
      if (modoMascara === 'binaria') {
        dados[o] = 28;
        dados[o + 1] = 24;
        dados[o + 2] = 20;
        dados[o + 3] = 255;
        continue;
      }

      const classe = classePorRotulo.get(r);
      if (!classe) continue;
      const hex = corDe(classe);
      let rgb = cache.get(hex);
      if (!rgb) {
        rgb = [
          parseInt(hex.slice(1, 3), 16),
          parseInt(hex.slice(3, 5), 16),
          parseInt(hex.slice(5, 7), 16),
        ];
        cache.set(hex, rgb);
      }
      dados[o] = rgb[0];
      dados[o + 1] = rgb[1];
      dados[o + 2] = rgb[2];
      dados[o + 3] = 105;
    }
    ctx.putImageData(img, 0, 0);
  }, [resultado, modoMascara]);

  // --- Retângulos orientados e rótulos ---
  useEffect(() => {
    const c = marcas.current;
    if (!c || !resultado) return;
    const { larguraProc: lp, alturaProc: ap, deteccoes } = resultado;

    // Desenhado na resolução de processamento e escalado pelo CSS: as medidas
    // ficam no mesmo referencial em que foram calculadas.
    c.width = lp;
    c.height = ap;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, lp, ap);

    const escala = lp / 900;
    ctx.lineJoin = 'round';

    for (const d of deteccoes) {
      const ativo = destacado === d.id;
      const cor = corDe(d.classe);

      ctx.save();
      ctx.translate(d.obb.cx, d.obb.cy);
      ctx.rotate(d.obb.angulo);
      ctx.strokeStyle = cor;
      ctx.lineWidth = (ativo ? 3.5 : 1.8) * escala;
      if (ativo) {
        ctx.fillStyle = `${cor}30`;
        ctx.fillRect(-d.obb.w / 2, -Math.max(d.obb.h, 5) / 2, d.obb.w, Math.max(d.obb.h, 5));
      }
      // Altura mínima de desenho: um fragmento fino tem poucos pixels de
      // espessura e a borda engoliria o próprio retângulo. Vale só para o
      // traço — a medida usada no cálculo continua a real.
      ctx.strokeRect(-d.obb.w / 2, -Math.max(d.obb.h, 5) / 2, d.obb.w, Math.max(d.obb.h, 5));
      ctx.restore();
    }

    if (!mostrarRotulos) return;

    ctx.font = `${11 * escala}px ui-monospace, monospace`;
    ctx.textBaseline = 'middle';

    for (const d of deteccoes) {
      const ativo = destacado === d.id;
      if (!ativo && d.confianca < 0.45) continue; // evita empilhar rótulo fraco

      const texto = `${rotuloDe(d.classe)} ${d.confianca.toFixed(2)} · ${d.massaKg.toFixed(2)} kg`;
      const largura = ctx.measureText(texto).width + 10 * escala;
      const altura = 16 * escala;

      let x = d.obb.cx - largura / 2;
      let y = d.obb.cy - Math.max(d.obb.h, 6) / 2 - altura;
      x = Math.max(2, Math.min(lp - largura - 2, x));
      if (y < 2) y = d.obb.cy + Math.max(d.obb.h, 6) / 2 + 2;

      ctx.fillStyle = corDe(d.classe);
      ctx.globalAlpha = ativo ? 1 : 0.9;
      ctx.fillRect(x, y, largura, altura);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillText(texto, x + 5 * escala, y + altura / 2);
    }
  }, [resultado, destacado, mostrarRotulos]);

  function aoMover(ev: React.PointerEvent<HTMLDivElement>) {
    if (!resultado || !caixa.current) return;
    const r = caixa.current.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * resultado.larguraProc;
    const py = ((ev.clientY - r.top) / r.height) * resultado.alturaProc;
    const i = Math.floor(py) * resultado.larguraProc + Math.floor(px);

    if (i < 0 || i >= resultado.rotulos.length) return aoDestacar(null);
    const rotulo = resultado.rotulos[i];
    // Consulta direta no mapa de rótulos: custo constante, sem varrer polígonos.
    aoDestacar(rotulo && resultado.manter[rotulo] ? rotulo : null);
  }

  const escalaBarra =
    cmPorPxOriginal !== null ? (50 / cmPorPxOriginal / bitmap.width) * 100 : null;

  return (
    <div
      ref={caixa}
      className="relative w-full select-none overflow-hidden rounded-sm border border-linha-forte bg-tinta"
      style={{ aspectRatio: `${bitmap.width} / ${bitmap.height}` }}
      onPointerMove={aoMover}
      onPointerLeave={() => aoDestacar(null)}
    >
      <canvas ref={base} className="absolute inset-0 size-full" />
      <canvas
        ref={mascara}
        className="absolute inset-0 size-full"
        style={{
          imageRendering: 'pixelated',
          opacity: modoMascara === 'oculta' ? 0 : 1,
          // A máscara aparece com seus pixels reais, sem suavização: mostrar a
          // resolução efetiva do processamento é mais honesto que disfarçá-la.
          mixBlendMode: modoMascara === 'binaria' ? 'normal' : 'normal',
          background: modoMascara === 'binaria' ? 'var(--color-papel-alto)' : 'transparent',
        }}
      />
      <canvas ref={marcas} className="absolute inset-0 size-full" />

      {escalaBarra !== null && (
        <div
          className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-1"
          style={{ width: `${escalaBarra}%` }}
        >
          <div className="flex h-2 w-full overflow-hidden rounded-[1px] border border-papel">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-full flex-1"
                style={{ backgroundColor: i % 2 ? '#1c1814' : '#f4f0e8' }}
              />
            ))}
          </div>
          <span className="dado text-[0.62rem] leading-none text-papel drop-shadow">50 cm</span>
        </div>
      )}
    </div>
  );
}

export { corDe, rotuloDe };
