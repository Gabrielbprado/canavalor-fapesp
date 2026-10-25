'use client';

/**
 * Ciclo de vida do pipeline de visão na interface.
 *
 * A imagem é preparada uma única vez; os controles só disparam o segundo
 * estágio. Sem essa separação, cada movimento de controle refaria a conversão
 * de cor da imagem inteira e o ajuste ao vivo seria impossível.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ParametrosMassa } from '../../lib/cv/classificador';
import {
  prepararImagem,
  processar,
  type ContextoImagem,
} from '../../lib/cv/pipeline';
import type { ParametrosSegmentacao, ResultadoPipeline } from '../../lib/cv/tipos';

export interface Amostra {
  id: string;
  rotulo: string;
  arquivo: string;
  perda_pct: number;
  massa_kg: number;
  fragmentos: number;
}

export interface GroundTruth {
  id: string;
  rotulo: string;
  cena: { px_por_cm: number; cm_por_px: number; area_m2: number };
  referencia: { produtividade_t_ha: number; perda_pct_alvo: number };
  modelo_verdade: { formula: string; nota: string };
  real: {
    por_classe: Record<string, { contagem: number; massa_kg: number }>;
    massa_total_kg: number;
    contagem_total: number;
    perda_kg_ha: number;
    perda_pct_efetiva: number;
  };
}

export interface FonteImagem {
  bitmap: ImageBitmap;
  imagem: ImageData;
  /** Escala em cm por pixel. Nula quando a imagem veio de upload sem calibração. */
  cmPorPx: number | null;
  areaM2: number | null;
  rotulo: string;
  origem: 'amostra' | 'upload';
  groundTruth: GroundTruth | null;
}

async function lerImagem(blob: Blob): Promise<{ bitmap: ImageBitmap; imagem: ImageData }> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponível neste navegador');
  ctx.drawImage(bitmap, 0, 0);
  return { bitmap, imagem: ctx.getImageData(0, 0, bitmap.width, bitmap.height) };
}

export function usePipeline(
  parametros: ParametrosSegmentacao,
  parametrosMassa: ParametrosMassa,
) {
  const [fonte, setFonte] = useState<FonteImagem | null>(null);
  const [resultado, setResultado] = useState<ResultadoPipeline | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Guarda também o peso usado na construção: é o que decide se o primeiro
  // estágio precisa ser refeito.
  const contexto = useRef<{ ctx: ContextoImagem; peso: number } | null>(null);

  const carregarAmostra = useCallback(async (amostra: Amostra) => {
    setCarregando(true);
    setErro(null);
    try {
      const [blob, gt] = await Promise.all([
        fetch(`/samples/${amostra.arquivo}`).then((r) => r.blob()),
        fetch(`/samples/talhao-${amostra.id}.gt.json`).then((r) => r.json() as Promise<GroundTruth>),
      ]);
      const { bitmap, imagem } = await lerImagem(blob);
      contexto.current = null;
      setFonte({
        bitmap,
        imagem,
        cmPorPx: gt.cena.cm_por_px,
        areaM2: gt.cena.area_m2,
        rotulo: gt.rotulo,
        origem: 'amostra',
        groundTruth: gt,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar a amostra');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarArquivo = useCallback(async (arquivo: File, cmPorPx: number | null) => {
    setCarregando(true);
    setErro(null);
    try {
      const { bitmap, imagem } = await lerImagem(arquivo);
      contexto.current = null;
      const area =
        cmPorPx === null
          ? null
          : ((bitmap.width * cmPorPx) / 100) * ((bitmap.height * cmPorPx) / 100);
      setFonte({
        bitmap,
        imagem,
        cmPorPx,
        areaM2: area,
        rotulo: arquivo.name,
        origem: 'upload',
        groundTruth: null,
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao ler a imagem');
    } finally {
      setCarregando(false);
    }
  }, []);

  /** Redefine a escala de uma imagem enviada, sem recarregar os pixels. */
  const recalibrar = useCallback((cmPorPx: number) => {
    setFonte((f) => {
      if (!f) return f;
      contexto.current = null;
      return {
        ...f,
        cmPorPx,
        areaM2: ((f.imagem.width * cmPorPx) / 100) * ((f.imagem.height * cmPorPx) / 100),
      };
    });
  }, []);

  useEffect(() => {
    const cmPorPx = fonte?.cmPorPx ?? null;

    // Coalesce por quadro: arrastar um controle dispara dezenas de eventos, e
    // processar todos deixaria a interface travada atrás da própria fila. O
    // estado só é tocado dentro do quadro, nunca de forma síncrona no efeito.
    const pedido = requestAnimationFrame(() => {
      if (!fonte || cmPorPx === null) {
        setResultado(null);
        return;
      }
      try {
        // O peso da luminância entra na construção dos mapas de cor, então
        // trocá-lo obriga a refazer o primeiro estágio — ao contrário dos
        // demais controles, que só afetam o segundo.
        if (!contexto.current || contexto.current.peso !== parametros.pesoLuminancia) {
          const ctx = prepararImagem(fonte.imagem, cmPorPx, parametros.pesoLuminancia);
          contexto.current = { ctx, peso: parametros.pesoLuminancia };
        }
        setResultado(processar(contexto.current.ctx, parametros, parametrosMassa));
        setErro(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Falha ao processar a imagem');
      }
    });

    return () => cancelAnimationFrame(pedido);
  }, [fonte, parametros, parametrosMassa]);

  return {
    fonte,
    resultado,
    carregando,
    erro,
    carregarAmostra,
    carregarArquivo,
    recalibrar,
  };
}
