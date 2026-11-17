#!/usr/bin/env python3
"""
Recorta la hoja del oficinista de Imersa Studios (Office Pixel Art, Free)
al formato del compositor de PixelVibe.

Fuente (versión FREE, ya descargada en /tmp/imersa/pack/):
  Characters/office_worker/office_worker.png — 128x256 px,
  4 columnas x 8 filas de celdas 32x32. Filas segun office_worker.json:
  idle_down 0, idle_left 1, idle_right 2, idle_up 3,
  walk_down 4, walk_left 5, walk_right 6, walk_up 7.
  4 frames por fila. Pies en el pixel (16, 30) de cada celda.
  Contenido por celda: x 8-24, y 0-31 (el personaje ocupa casi toda la
  celda, ~31 px de alto; los actuales ocupan ~26 px, asi que este se
  vera ~19% mas alto en pantalla — aceptable).

Destino:
  public/assets/sprites/skin_imersa_office_worker.png — 192x128 px,
  formato del compositor: 6 columnas x 4 filas, filas abajo 0 /
  izquierda 1 / derecha 2 / arriba 3, columna 0 = idle,
  columnas 1-5 = caminar.

Mapeo por direccion d (0 abajo, 1 izquierda, 2 derecha, 3 arriba):
  col 0 <- fila idle d, frame 0
  col 1 <- fila walk d+4, frame 0
  col 2 <- walk frame 1
  col 3 <- walk frame 2
  col 4 <- walk frame 3
  col 5 <- walk frame 1 (repeticion del frame medio: el compositor
           anima 5 frames por paso y la hoja original solo trae 4;
           repetir el frame central evita un salto brusco al cerrar
           el ciclo, igual que hacen las capas actuales con 2 poses).
  El idle del compositor es un solo frame (col 0), igual que los
  actuales.

Uso:  python3 scripts/imersa/recut_office_worker.py
Re-ejecutable: sobrescribe el mismo PNG con el mismo resultado.
"""

import os

from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = "/tmp/imersa/pack/Office_Pixel_Art_Free_v1.0/Characters/office_worker/office_worker.png"
DST = os.path.normpath(os.path.join(BASE, "..", "..", "public", "assets", "sprites", "skin_imersa_office_worker.png"))

CELL = 32
# Direccion -> fila idle / fila walk en la hoja original
DIRS = ("down", "left", "right", "up")
# Columna destino -> frame de la fila walk (col 0 es idle, frame 0)
WALK_FRAMES = (0, 1, 2, 3, 1)  # cols 1-5; el ultimo repite el frame medio


def main() -> None:
    src = Image.open(SRC).convert("RGBA")
    assert src.size == (128, 256), f"Hoja original inesperada: {src.size}"

    dst = Image.new("RGBA", (6 * CELL, 4 * CELL), (0, 0, 0, 0))

    for d, _name in enumerate(DIRS):
        idle_row = d
        walk_row = d + 4
        # col 0: idle, frame 0
        dst.paste(src.crop((0, idle_row * CELL, CELL, (idle_row + 1) * CELL)), (0, d * CELL))
        # cols 1-5: walk
        for col, frame in enumerate(WALK_FRAMES, start=1):
            cell = src.crop((frame * CELL, walk_row * CELL, (frame + 1) * CELL, (walk_row + 1) * CELL))
            dst.paste(cell, (col * CELL, d * CELL))

    os.makedirs(os.path.dirname(DST), exist_ok=True)
    dst.save(DST)
    print(f"OK: {DST} ({dst.size[0]}x{dst.size[1]})")


if __name__ == "__main__":
    main()
