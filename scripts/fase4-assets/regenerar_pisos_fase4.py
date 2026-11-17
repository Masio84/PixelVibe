#!/usr/bin/env python3
"""
Regenera los pisos de PixelVibe (Fase 4, parte C: assets).

- Mantiene el formato 64x32 y la mascara alfa (rombo isometrico) original
  de cada PNG, por lo que el punto de apoyo no cambia.
- Sustituye los 2 colores planos por una textura sutil coordinada con la
  paleta MT Digital Solutions (azul marino #0B1B33, azul electrico #2563EB,
  turquesa #14B8A6; neutros calidos permitidos para madera):
  variacion tonal leve de baja frecuencia + banda de borde suave
  (en vez de banda dura de 2 colores) + vetas/juntas segun el material.
- floor_reception.png NO se toca: ya tiene textura real de madera
  (363 colores medidos con PIL).

Uso:  python3 regenerar_pisos_fase4.py
Re-ejecutable: sobrescribe los mismos PNG con el mismo resultado
(semilla fija).
"""
import os
import numpy as np
from PIL import Image, ImageFilter

BASE = os.path.dirname(os.path.abspath(__file__))
TILESETS = os.path.normpath(os.path.join(BASE, "..", "..", "public", "assets", "tilesets"))

# base, borde, material, variacion (amplitud del ruido en +-fraccion)
FLOORS = {
    # Desarrollo: gris azulado frio (antes gris neutro #a1a1aa)
    "floor_open.png":     ((183, 195, 214), (147, 165, 191), "tile", 0.05),
    # Sala de Juntas: pervinca suave coordinado con azul electrico
    # (antes lavanda #c4b5fd)
    "floor_meet.png":     ((169, 184, 236), (132, 152, 210), "tile", 0.05),
    # Descanso: arena crema calida (antes amarillo #fef08a)
    "floor_break.png":    ((230, 211, 168), (203, 178, 127), "tile", 0.05),
    # Tranquila: azul cielo palido (antes #93c5fd)
    "floor_quiet.png":    ((168, 200, 239), (134, 173, 222), "tile", 0.05),
    # Terraza: menta turquesa (antes verde menta #86efac)
    "floor_terr.png":     ((147, 217, 194), (111, 191, 166), "tile", 0.05),
    # Jardin: verde salvia suave (antes verde #7ec850)
    "floor_garden.png":   ((169, 207, 146), (135, 181, 110), "tile", 0.05),
    # Lobby: madera miel con tablones (antes madera plana #c9a06c)
    "floor_lobby.png":    ((201, 154, 99),  (168, 124, 72),  "wood", 0.06),
    # Director: azul marino profundo, familia #0B1B33
    # (antes morado oscuro #4a4063). Lo bastante claro para seguir
    # viendose bajo el filtro azul de la escena.
    "floor_private.png":  ((32, 57, 94),    (21, 42, 71),    "tile", 0.06),
}

W, H = 64, 32


def smooth_noise(rng, w, h, scale_x, scale_y):
    """Ruido de baja frecuencia: aleatorio grueso reescalado con bicubica."""
    small = rng.normal(0.0, 1.0, (max(2, h // scale_y), max(2, w // scale_x)))
    img = Image.fromarray(((small - small.min()) / (small.ptp() + 1e-9) * 255).astype(np.uint8))
    img = img.resize((w, h), Image.BICUBIC)
    arr = np.asarray(img, dtype=np.float64) / 255.0
    return (arr - arr.mean()) / (arr.std() + 1e-9)


def edge_falloff(mask):
    """Distancia al borde del rombo en px (0 en el borde, 6+ dentro),
    calculada por erosion sucesiva de la mascara."""
    m = mask.astype(bool)
    dist = np.zeros(m.shape, dtype=np.float64)
    cur = m.copy()
    for k in range(1, 8):
        eroded = np.zeros_like(cur)
        eroded[1:-1, 1:-1] = cur[:-2, 1:-1] & cur[2:, 1:-1] & cur[1:-1, :-2] & cur[1:-1, 2:]
        band = cur & ~eroded
        dist[band] = k - 1
        cur = eroded
        if not cur.any():
            break
    dist[cur] = 7
    return np.clip(dist, 0, 7)


def build_floor(fname, base, edge, material, amp, rng):
    orig = Image.open(os.path.join(TILESETS, fname)).convert("RGBA")
    assert orig.size == (W, H), f"{fname}: tamano inesperado {orig.size}"
    alpha = np.asarray(orig.getchannel("A"), dtype=np.uint8)
    mask = alpha > 0

    base_arr = np.array(base, dtype=np.float64)
    edge_arr = np.array(edge, dtype=np.float64)

    # 1) Variacion tonal leve de baja frecuencia + grano fino.
    n1 = smooth_noise(rng, W, H, 8, 4)          # manchas suaves grandes
    n2 = smooth_noise(rng, W, H, 3, 2)          # variacion media
    fine = rng.normal(0.0, 1.0, (H, W))         # grano fino
    fine = fine / (np.abs(fine).max() + 1e-9)
    tone = 1.0 + amp * (0.6 * n1 + 0.3 * n2 + 0.15 * fine)
    rgb = np.ones((H, W, 3)) * base_arr * tone[..., None]

    # 2) Vetas de madera: tablones paralelos a una diagonal del rombo
    # (pendiente +0,5) con junta oscura y tono alterno por tablon.
    if material == "wood":
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
        # Coordenada perpendicular a la direccion del tablon.
        u = yy - 0.5 * xx
        plank = np.floor(u / 7.0)
        # Junta de 1 px en el borde de cada tablon.
        seam = (np.abs((u % 7.0)) < 0.7) | (np.abs((u % 7.0) - 7.0) < 0.7)
        # Tono alterno por tablon (+-3,5 %).
        alt = np.where((plank % 2) == 0, 1.035, 0.965)
        rgb *= alt[..., None]
        rgb[seam] *= 0.82
        # Veta: ruido alargado en la direccion del tablon.
        grain = smooth_noise(rng, W, H, 16, 2)
        rgb *= (1.0 + 0.035 * grain)[..., None]

    # 3) Banda de borde suave: del color borde en el perimetro al color
    # base a ~6 px hacia dentro (antes era una banda dura de 2 colores).
    d = edge_falloff(mask)
    t = np.clip(d / 6.0, 0, 1)  # 0 borde -> 1 interior
    t = t * t * (3 - 2 * t)     # suavizado
    edge_rgb = np.ones((H, W, 3)) * edge_arr
    rgb = edge_rgb * (1 - t)[..., None] + rgb * t[..., None]

    # 4) Ligero realce central (volumen sutil, +3 % en el centro).
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    cx, cy = (W - 1) / 2.0, (H - 1) / 2.0
    r = np.sqrt(((xx - cx) / 32.0) ** 2 + ((yy - cy) / 16.0) ** 2)
    rgb *= (1.0 + 0.03 * np.clip(1 - r, 0, 1))[..., None]

    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    out = np.dstack([rgb, alpha])
    img = Image.fromarray(out, "RGBA")
    img.save(os.path.join(TILESETS, fname))
    return img


def verify(fname):
    im = Image.open(os.path.join(TILESETS, fname)).convert("RGBA")
    colors = im.getcolors(maxcolors=1000000)
    opaque = [c for c in colors if c[1][3] > 0]
    mean = np.asarray(im)[..., :3][np.asarray(im)[..., 3] > 0].mean(axis=0)
    print(f"  {fname}: {im.size} colores_opacos={len(opaque)} "
          f"media_rgb={tuple(int(round(v)) for v in mean)}")
    assert im.size == (W, H)
    assert len(opaque) > 20, f"{fname}: textura insuficiente"
    return len(opaque)


def main():
    rng = np.random.default_rng(20261116)
    print("Regenerando pisos (se conserva floor_reception.png):")
    for fname, (base, edge, material, amp) in FLOORS.items():
        build_floor(fname, base, edge, material, amp, rng)
        verify(fname)
    # Verificar que el conservado sigue intacto.
    print("Conservado (sin tocar):")
    verify("floor_reception.png")
    print("OK: 8 pisos regenerados, 1 conservado.")


if __name__ == "__main__":
    main()
