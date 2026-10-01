#!/usr/bin/env python3
"""
Il Rustico - pulizia del reel scaricato da Instagram.

1. Taglia il finale con il logo Instagram (da 13,5 s in poi).
2. Toglie la filigrana (icona + @ILRUSTICO_SUITEESAUNA) ricostruendo lo
   sfondo con LaMa: in alto a destra fino al fotogramma 266, in basso a
   sinistra dal 272 (in mezzo la filigrana e' assente).
3. Esporta un intermedio 720x1280 pulito (sorgenti/reel_pulito_720.mp4) da
   portare in 1080p con Topaz Video (Higgsfield).
4. Con --finale: prende il 1080p di Topaz, rimette nei primi 2,5 s i
   fotogrammi originali dell'intro (Il_Rustico_Intro_Vetro.mp4, nel reel
   accelerata x1,2) ed esporta Il_Rustico_Reel_HD.mp4.

Requisiti extra: torch, spandrel, safetensors e i pesi LaMa
(generatore di anyisalin/big-lama su Hugging Face) in LAMA.
"""
import argparse
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "sorgenti" / "reel_instagram.mp4"
INTER = ROOT / "sorgenti" / "reel_pulito_720.mp4"
TOPAZ = ROOT / "sorgenti" / "reel_topaz_1080.mp4"
INTRO = ROOT / "Il_Rustico_Intro_Vetro.mp4"
OUT = ROOT / "Il_Rustico_Reel_HD.mp4"
LAMA = ROOT / "sorgenti" / "big-lama-gen.safetensors"

W0, H0 = 720, 1280
ULTIMO = 403              # ultimo fotogramma prima del finale Instagram (13,47 s)
FINE_INTRO = 75           # fino a qui il reel coincide con l'intro originale
# filigrana: (primo, ultimo fotogramma, ritaglio 256x256 (x, y), rettangoli da coprire)
FILIGRANE = [
    (0, 266, (464, 260), [(618, 323, 667, 372), (478, 386, 669, 412)]),
    (272, ULTIMO, (0, 620), [(53, 695, 102, 745), (50, 757, 239, 788)]),
]


def leggi(path, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h}",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)


def pulisci():
    import torch
    from safetensors.torch import load_file
    from spandrel import ModelLoader
    torch.set_num_threads(4)
    lama = ModelLoader().load_from_state_dict(load_file(str(LAMA))).eval()
    fr = leggi(SRC, W0, H0)[:ULTIMO + 1].copy()
    maschere = []
    for a, b, (cx, cy), rett in FILIGRANE:
        m = np.zeros((256, 256), np.float32)
        for x0, y0, x1, y1 in rett:
            cv2.rectangle(m, (x0 - cx, y0 - cy), (x1 - cx, y1 - cy), 1, -1)
        maschere.append(cv2.dilate(m, np.ones((7, 7), np.uint8)))
    mt = torch.from_numpy(np.stack(maschere))[:, None]
    for k in range(FINE_INTRO + 1, ULTIMO + 1):
        for i, (a, b, (cx, cy), _) in enumerate(FILIGRANE):
            if not a <= k <= b:
                continue
            crop = fr[k, cy:cy + 256, cx:cx + 256].astype(np.float32) / 255
            with torch.no_grad():
                o = lama(torch.from_numpy(crop).permute(2, 0, 1)[None], mt[i:i + 1])
            o = (o[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255 + 0.5).astype(np.uint8)
            m = maschere[i][..., None]
            fr[k, cy:cy + 256, cx:cx + 256] = (o * m + fr[k, cy:cy + 256, cx:cx + 256] * (1 - m)).astype(np.uint8)
        if k % 20 == 0:
            print(f"  fotogramma {k}/{ULTIMO}", flush=True)
    dur = (ULTIMO + 1) / 30
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W0}x{H0}",
           "-r", "30", "-i", "pipe:", "-i", str(SRC), "-map", "0:v", "-map", "1:a", "-t", f"{dur}",
           "-af", f"afade=t=out:st={dur - 0.6:.2f}:d=0.6",
           "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(INTER)]
    subprocess.run(cmd, input=fr.tobytes(), check=True)
    print("Creato", INTER)


def finale():
    W, H = 1080, 1920
    hd = leggi(TOPAZ, W, H)
    intro = leggi(INTRO, W, H)
    n = ULTIMO + 1
    hd = hd[:n].copy()
    # nel reel l'intro scorre a x1,2: fotogramma k del reel = fotogramma round(1,2 k) dell'intro
    for k in range(FINE_INTRO + 1):
        hd[k] = intro[min(int(round(k * 1.2)), len(intro) - 1)]
    # nel montaggio originale c'era un fotogramma nero isolato (7,57 s): lo sostituisce il precedente
    for k in range(1, n - 1):
        if hd[k].mean() < 8 and hd[k - 1].mean() > 20 and hd[k + 1].mean() > 20:
            print(f"  fotogramma nero {k} sostituito")
            hd[k] = hd[k - 1]
    dur = n / 30
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", "30", "-i", "pipe:", "-i", str(INTER), "-map", "0:v", "-map", "1:a", "-t", f"{dur}",
           "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-profile:v", "high", "-level", "4.1",
           "-pix_fmt", "yuv420p", "-maxrate", "16M", "-bufsize", "32M",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-c:a", "copy", "-movflags", "+faststart", str(OUT)]
    subprocess.run(cmd, input=hd.tobytes(), check=True)
    print("Creato", OUT)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--finale", action="store_true")
    if ap.parse_args().finale:
        finale()
    else:
        pulisci()
