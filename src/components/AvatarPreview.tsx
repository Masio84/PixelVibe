'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import type { AvatarConfig } from '@/lib/types';
import { resolvePreviewLayers } from '@/lib/avatarPresets';

/**
 * AvatarPreview — Vista previa REAL del avatar (sprite compuesto, no emoji).
 *
 * Reutiliza las mismas hojas de sprites que AvatarCompositor
 * (/assets/sprites/<pieza>.png, 192×128, frames de 32×32) y las compone en
 * un canvas 2D con el mismo orden de capas (AVATAR_LAYER_ORDER) y los mismos
 * tintes por capa que Phaser. Se dibuja el frame idle mirando hacia abajo
 * (fila 0, columna 0), igual que el idle inicial del juego.
 *
 * Por qué no se usa AvatarCompositor directamente: necesita una escena de
 * Phaser viva (scene.add.sprite, texturas registradas, animaciones); montar
 * un mini-juego de Phaser dentro de un modal por cada vista previa sería
 * mucho más pesado y frágil que componer el mismo frame en canvas 2D.
 * Los sprites base son blancos, así que el tinte `multiply` del canvas
 * reproduce exactamente el `setTint` de Phaser.
 */

const FRAME = 32;

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadSprite(key: string): Promise<HTMLImageElement | null> {
  const cached = imageCache.get(key);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[AvatarPreview] Sprite no encontrado: /assets/sprites/${key}.png`);
      resolve(null);
    };
    img.src = `/assets/sprites/${key}.png`;
  });
  imageCache.set(key, promise);
  return promise;
}

/** Dibuja un frame 32×32 con tinte multiply (o sin tinte) en el contexto. */
function drawTintedFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tint: string | null,
  dx: number,
  dy: number,
  size: number,
) {
  if (!tint) {
    ctx.drawImage(img, 0, 0, FRAME, FRAME, dx, dy, size, size);
    return;
  }
  // Capa temporal del tamaño del frame: se tiñe con multiply y se
  // restaura el alfa original con destination-in, igual que setTint.
  const tmp = document.createElement('canvas');
  tmp.width = FRAME;
  tmp.height = FRAME;
  const tctx = tmp.getContext('2d');
  if (!tctx) return;
  tctx.drawImage(img, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
  tctx.globalCompositeOperation = 'multiply';
  tctx.fillStyle = tint;
  tctx.fillRect(0, 0, FRAME, FRAME);
  tctx.globalCompositeOperation = 'destination-in';
  tctx.drawImage(img, 0, 0, FRAME, FRAME, 0, 0, FRAME, FRAME);
  ctx.drawImage(tmp, 0, 0, FRAME, FRAME, dx, dy, size, size);
}

interface AvatarPreviewProps {
  config: AvatarConfig;
  /** Tamaño en px del canvas (el sprite se escala sin suavizado). */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export default function AvatarPreview({ config, size = 96, className, style }: AvatarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);

    const layers = resolvePreviewLayers(config);
    void Promise.all(layers.map((l) => loadSprite(l.key))).then((images) => {
      if (cancelled) return;
      ctx.clearRect(0, 0, size, size);
      layers.forEach((layer, i) => {
        const img = images[i];
        if (img) drawTintedFrame(ctx, img, layer.tint, 0, 0, size);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [config, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated', display: 'block', ...style }}
      role="img"
      aria-label="Vista previa de tu personaje"
    />
  );
}
