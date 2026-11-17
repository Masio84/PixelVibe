#!/usr/bin/env python3
"""
Pre-escala los sprites voxel de PixelVibe (Fase 4, parte C: assets).

Problema: los PNG voxel son canvas de 64x64 y el dibujo los escala a
0,34-0,72 con nearest-neighbor, lo que produce aliasing (se ven mas
"sucios" que el personaje, dibujado 1:1).

Solucion: pre-escalar el CONTENIDO de cada sprite a su altura objetivo
(VOXEL_TARGET_H por categoria: low 21, desk 28, mid 34, tall 42 px)
con PIL/LANCZOS, dentro del mismo canvas de 64x64, conservando la
posicion del punto de apoyo:

- El canvas sigue siendo 64x64 y el "bottom" del contenido se conserva,
  porque IsometricScene.drawVoxelProp() usa la constante 64 en la
  formula de anclaje: y + 16 + (64 - contentBottom) * scale.
  Cambiar el tamano del canvas romperia ese anclaje; por eso el
  contenido pre-escalado se vuelve a pegar en un canvas 64x64.
- Tras el re-escalado, la escala que calcula el dibujo
  (objetivo / h_medido) queda ~1,0, asi que ya no hay downscale
  en tiempo de ejecucion.

Pasos:
  1. Backup de los PNG originales en /tmp/voxel-originales-fase4/
  2. Pre-escalado con LANCZOS (RGB premultiplicado por alfa para no
     generar halos oscuros en los bordes) + limpieza de alfa < 8.
  3. Re-medicion con PIL de la caja de contenido real de cada PNG
     modificado y actualizacion SOLO del bloque VOXEL_METRICS en
     src/game/voxelAssets.ts (VOXEL_TARGET_H y el resto del archivo
     no se tocan).

Uso:  python3 preescalar_voxel_fase4.py
"""
import json
import os
import re
import shutil

import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(BASE, "..", ".."))
VOXEL_DIR = os.path.join(REPO, "public", "assets", "props", "voxel")
TS_PATH = os.path.join(REPO, "src", "game", "voxelAssets.ts")
BACKUP_DIR = "/tmp/voxel-originales-fase4"
ALPHA_CLEAN = 8  # alfa por debajo de esto se pone a 0 (franja tenue del LANCZOS)


def parse_ts():
    src = open(TS_PATH, encoding="utf-8").read()
    assets = {}
    for m in re.finditer(r"(\d+):\s*\{\s*name:\s*'[^']*',\s*file:\s*'([^']+)'\s*\}", src):
        assets[int(m.group(1))] = m.group(2)
    targets = {}
    m = re.search(r"export const VOXEL_TARGET_H[^=]*=\s*\{([^}]+)\}", src)
    for k, v in re.findall(r"(\w+):\s*(\d+)", m.group(1)):
        targets[k] = int(v)
    metrics = {}
    m = re.search(r"export const VOXEL_METRICS[^=]*=\s*\{(.*?)\n\};", src, re.S)
    for mid, w, h, b, cat in re.findall(
        r"(\d+):\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+),\s*bottom:\s*(\d+),\s*cat:\s*'(\w+)'\s*\}",
        m.group(1),
    ):
        metrics[int(mid)] = {"w": int(w), "h": int(h), "bottom": int(b), "cat": cat}
    return src, assets, targets, metrics


def measure(im):
    """Caja de contenido no transparente (alfa > 0) de un RGBA 64x64."""
    a = np.asarray(im.getchannel("A"))
    ys, xs = np.nonzero(a > 0)
    if len(xs) == 0:
        return {"w": 0, "h": 0, "bottom": 0, "left": 0, "top": 0}
    return {
        "w": int(xs.max() - xs.min() + 1),
        "h": int(ys.max() - ys.min() + 1),
        "bottom": int(ys.max() + 1),  # exclusivo, igual que la metrica original
        "left": int(xs.min()),
        "top": int(ys.min()),
    }


def resize_premult(crop, new_w, new_h):
    """Resize LANCZOS con alfa premultiplicado (sin halos oscuros)."""
    arr = np.asarray(crop).astype(np.float32)
    a = arr[..., 3:4] / 255.0
    rgb = arr[..., :3] * a
    rgb_im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    a_im = Image.fromarray(np.clip(a[..., 0] * 255, 0, 255).astype(np.uint8), "L")
    rgb2 = np.asarray(rgb_im.resize((new_w, new_h), Image.LANCZOS)).astype(np.float32)
    a2 = np.asarray(a_im.resize((new_w, new_h), Image.LANCZOS)).astype(np.float32)
    a2n = np.clip(a2 / 255.0, 0, 1)
    out_rgb = np.where(a2n[..., None] > 0, rgb2 / np.maximum(a2n[..., None], 1e-6), 0)
    out = np.dstack([np.clip(out_rgb, 0, 255), a2]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    src, assets, targets, metrics = parse_ts()
    assert len(assets) == 50, f"se esperaban 50 voxel, hay {len(assets)}"
    assert set(assets) == set(metrics), "assets y metrics no coinciden"

    # 1) Backup de originales.
    os.makedirs(BACKUP_DIR, exist_ok=True)
    for f in sorted(set(assets.values())):
        shutil.copy2(os.path.join(VOXEL_DIR, f), os.path.join(BACKUP_DIR, f))
    print(f"Backup de {len(set(assets.values()))} PNG originales en {BACKUP_DIR}")

    # 2) Pre-escalado.
    report = []
    for vid in sorted(assets):
        path = os.path.join(VOXEL_DIR, assets[vid])
        im = Image.open(path).convert("RGBA")
        assert im.size == (64, 64), f"{assets[vid]}: tamano {im.size}"
        old = measure(im)
        rec = metrics[vid]
        if (old["w"], old["h"], old["bottom"]) != (rec["w"], rec["h"], rec["bottom"]):
            print(f"  AVISO id {vid}: metrica registrada {rec} != medida real "
                  f"{old['w']}x{old['h']} b{old['bottom']} (se usa la medida real)")
        target = targets[metrics[vid]["cat"]]
        s = target / old["h"]
        new_w = max(1, round(old["w"] * s))
        new_h = max(1, round(old["h"] * s))
        crop = im.crop((old["left"], old["top"],
                        old["left"] + old["w"], old["top"] + old["h"]))
        small = resize_premult(crop, new_w, new_h)
        # Limpieza de franja tenue del LANCZOS.
        arr = np.array(small)  # copia escribible
        arr[..., 3] = np.where(arr[..., 3] < ALPHA_CLEAN, 0, arr[..., 3])
        small = Image.fromarray(arr, "RGBA")
        # Pegar en canvas 64x64 conservando bottom y centro-x originales.
        canvas = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        cx = old["left"] + old["w"] / 2.0
        new_left = int(round(cx - new_w / 2.0))
        new_left = max(0, min(64 - new_w, new_left))
        new_top = old["bottom"] - new_h
        assert new_top >= 0, f"id {vid}: new_top negativo"
        canvas.paste(small, (new_left, new_top), small)
        canvas.save(path)
        new = measure(canvas)
        scale = target / new["h"] if new["h"] else 0
        report.append({
            "id": vid, "file": assets[vid], "cat": metrics[vid]["cat"],
            "old": {"w": old["w"], "h": old["h"], "bottom": old["bottom"]},
            "new": {"w": new["w"], "h": new["h"], "bottom": new["bottom"]},
            "target": target, "scale_dibujo": round(scale, 3),
        })
        print(f"  {vid:3d} {assets[vid]:28s} {metrics[vid]['cat']:4s} "
              f"{old['w']}x{old['h']} b{old['bottom']} -> "
              f"{new['w']}x{new['h']} b{new['bottom']} "
              f"(objetivo {target}, escala dibujo {scale:.3f})")

    # 3) Re-medir desde disco (verificacion independiente) y actualizar TS.
    new_metrics = {}
    for r in report:
        im = Image.open(os.path.join(VOXEL_DIR, r["file"])).convert("RGBA")
        m = measure(im)
        assert (m["w"], m["h"], m["bottom"]) == (
            r["new"]["w"], r["new"]["h"], r["new"]["bottom"]), f"id {r['id']}: re-medicion distinta"
        assert im.size == (64, 64)
        new_metrics[r["id"]] = {"w": m["w"], "h": m["h"], "bottom": m["bottom"],
                                "cat": r["cat"]}

    lines = ["export const VOXEL_METRICS: Record<number, { w: number; h: number; bottom: number; cat: VoxelCategory }> = {"]
    for vid in sorted(new_metrics):
        m = new_metrics[vid]
        lines.append(f"  {vid}: {{ w: {m['w']}, h: {m['h']}, bottom: {m['bottom']}, cat: '{m['cat']}' }},")
    lines.append("};")
    new_block = "\n".join(lines)
    new_src, n = re.subn(
        r"export const VOXEL_METRICS[^=]*=\s*\{.*?\n\};",
        lambda _: new_block, src, count=1, flags=re.S)
    assert n == 1, "no se encontro el bloque VOXEL_METRICS"
    assert new_src != src, "el bloque no cambio"
    open(TS_PATH, "w", encoding="utf-8").write(new_src)
    print("VOXEL_METRICS actualizado en src/game/voxelAssets.ts")

    with open("/tmp/voxel-preescalado-fase4.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    scales = [r["scale_dibujo"] for r in report]
    print(f"Escala de dibujo resultante: min {min(scales):.3f} max {max(scales):.3f} "
          f"(objetivo ~1,0)")
    print("OK: 50 voxel pre-escalados, metricas actualizadas.")


if __name__ == "__main__":
    main()
