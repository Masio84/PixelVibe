#!/usr/bin/env python3
"""
Pre-escala los sprites voxel de PixelVibe (Fase 5, parte ASSETS).

Objetivo: duplicar el tamano de dibujo de los muebles (el avatar se
dibuja al doble en esta misma fase): VOXEL_TARGET_H pasa de
low 21 / desk 28 / mid 34 / tall 42  a  low 42 / desk 56 / mid 68 / tall 84.

Por que el canvas pasa de 64x64 a 128x128 (y NO se queda en 64x64):
- El contenido tall de 84 px no cabe en 64 px de alto; el mid de 68 px
  tampoco. Y varios anchos duplicados superan 64 px (ej. id 115
  "Estante Pared": 46 -> 92 px; id 146: 38 -> 76 px; id 132: 37 -> 74 px).
- Mantener 64x64 obligaria a recortar sprites o a dejarlos en 64 px y
  que el dibujo los re-escalara x1,31 en tiempo de ejecucion, justo lo
  que la Fase 4 elimino (pre-escalado LANCZOS para escala de dibujo 1,0).
- Con canvas 128x128 todo cabe con margen (ancho max. 92 px, alto
  max. 84 px) y la escala de dibujo queda ~1,0 en los 50 sprites.

Consecuencia en codigo (NO hecha por este script, fuera de alcance):
IsometricScene.drawVoxelProp() ancla con la constante 64 en
  y + 16 + (64 - contentBottom) * scale
con origen (0.5, 1). Con canvas 128, esa constante debe ser 128, o el
mueble quedaria ~64 px por encima del piso (64 * scale). El cambio
exacto pendiente es: en src/game/scenes/IsometricScene.ts, linea del
`this.add.image(...)` dentro de drawVoxelProp, `64 - contentBottom`
-> `128 - contentBottom` (y por coherencia los fallbacks
`?? 64` de contentH/contentW/contentBottom -> `?? 128`; no se activan
nunca porque los 50 IDs tienen metrica, pero quedarian obsoletos).

Metodo (igual que Fase 4, adaptado al canvas 128):
  1. El respaldo de los PNG de Fase 4 ya existe en
     ~/workspace/goals/pixelvibe-fixes-and-improvements/hidden_files/voxel-fase4/
     (creado antes de correr este script; aqui solo se verifica que
     exista y tenga los 50 archivos). Los originales pre-Fase-4 NO se tocan.
  2. Pre-escalado con LANCZOS (RGB premultiplicado por alfa, sin halos)
     + limpieza de alfa < 8. Factor = nuevo objetivo / h medida actual
     (~2,0x). El contenido se pega en canvas 128x128 conservando el
     bottom duplicado (2*bottom) y el centro-x duplicado (2*cx), asi que
     el punto de apoyo no se mueve respecto al canvas.
  3. Re-medicion con PIL de cada PNG final y actualizacion de
     VOXEL_TARGET_H (42/56/68/84) y del bloque VOXEL_METRICS en
     src/game/voxelAssets.ts (y nada mas de ese archivo salvo el
     comentario de cabecera de esos bloques, que documenta el canvas).

Uso:  python3 preescalar_voxel_fase5.py
"""
import json
import os
import re

import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(BASE, "..", ".."))
VOXEL_DIR = os.path.join(REPO, "public", "assets", "props", "voxel")
TS_PATH = os.path.join(REPO, "src", "game", "voxelAssets.ts")
BACKUP_FASE4 = os.path.expanduser(
    "~/workspace/goals/pixelvibe-fixes-and-improvements/hidden_files/voxel-fase4")
CANVAS = 128
NEW_TARGETS = {"low": 42, "desk": 56, "mid": 68, "tall": 84}
ALPHA_CLEAN = 8  # alfa por debajo de esto se pone a 0 (franja tenue del LANCZOS)
REPORT_PATH = os.path.join(BASE, "voxel-preescalado-fase5.json")


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
    """Caja de contenido no transparente (alfa > 0) de un RGBA."""
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
    assert targets == {"low": 21, "desk": 28, "mid": 34, "tall": 42}, \
        f"objetivos Fase 4 inesperados: {targets} (el script parte de Fase 4)"
    assert os.path.isdir(BACKUP_FASE4) and len(
        [f for f in os.listdir(BACKUP_FASE4) if f.endswith(".png")]) == 50, \
        "falta el respaldo Fase 4 con 50 PNG en hidden_files/voxel-fase4/"
    print("Respaldo Fase 4 verificado (50 PNG). Entrada: canvas 64x64, "
          "salida: canvas 128x128, objetivos x2.")

    report = []
    for vid in sorted(assets):
        path = os.path.join(VOXEL_DIR, assets[vid])
        im = Image.open(path).convert("RGBA")
        assert im.size == (64, 64), \
            f"{assets[vid]}: tamano {im.size}, se esperaba 64x64 (Fase 4)"
        old = measure(im)
        rec = metrics[vid]
        if (old["w"], old["h"], old["bottom"]) != (rec["w"], rec["h"], rec["bottom"]):
            print(f"  AVISO id {vid}: metrica registrada {rec} != medida real "
                  f"{old['w']}x{old['h']} b{old['bottom']} (se usa la medida real)")
        target = NEW_TARGETS[metrics[vid]["cat"]]
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
        # Pegar en canvas 128x128 conservando bottom y centro-x duplicados.
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        cx = old["left"] + old["w"] / 2.0
        new_left = int(round(2 * cx - new_w / 2.0))
        new_left = max(0, min(CANVAS - new_w, new_left))
        new_top = 2 * old["bottom"] - new_h
        assert new_top >= 0, f"id {vid}: new_top negativo"
        assert new_top + new_h <= CANVAS, f"id {vid}: contenido fuera del canvas"
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

    # Re-medir desde disco (verificacion independiente) y actualizar TS.
    new_metrics = {}
    for r in report:
        im = Image.open(os.path.join(VOXEL_DIR, r["file"])).convert("RGBA")
        m = measure(im)
        assert (m["w"], m["h"], m["bottom"]) == (
            r["new"]["w"], r["new"]["h"], r["new"]["bottom"]), f"id {r['id']}: re-medicion distinta"
        assert im.size == (CANVAS, CANVAS), f"id {r['id']}: canvas {im.size}"
        assert abs(r["target"] / m["h"] - 1.0) <= 0.03, \
            f"id {r['id']}: escala de dibujo {r['target'] / m['h']:.3f} fuera de rango"
        new_metrics[r["id"]] = {"w": m["w"], "h": m["h"], "bottom": m["bottom"],
                                "cat": r["cat"]}

    new_src, n = re.subn(
        r"export const VOXEL_TARGET_H[^=]*=\s*\{[^}]+\}",
        "export const VOXEL_TARGET_H: Record<VoxelCategory, number> = {\n"
        "  low: 42, desk: 56, mid: 68, tall: 84,\n}",
        src, count=1)
    assert n == 1, "no se encontro el bloque VOXEL_TARGET_H"
    src = new_src
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
    print("VOXEL_TARGET_H (42/56/68/84) y VOXEL_METRICS actualizados en "
          "src/game/voxelAssets.ts")

    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    print(f"Informe JSON en {REPORT_PATH}")
    scales = [r["scale_dibujo"] for r in report]
    print(f"Escala de dibujo resultante: min {min(scales):.3f} max {max(scales):.3f} "
          f"(objetivo ~1,0)")
    print("OK: 50 voxel pre-escalados x2 en canvas 128x128, metricas actualizadas.")
    print("PENDIENTE (fuera de alcance): cambiar 64 -> 128 en el anclaje de "
          "drawVoxelProp() en src/game/scenes/IsometricScene.ts.")


if __name__ == "__main__":
    main()
