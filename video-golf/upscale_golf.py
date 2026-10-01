#!/usr/bin/env python3
"""
Ricava il dettaglio golf (mazza, pallina, green) dalla grafica promozionale
e lo ingrandisce x4 con Real-ESRGAN, senza le scritte della locandina.

Serve solo se si cambia il ritaglio: il risultato e' gia' salvato in
materiali/golf-dettaglio-x4.jpg.

Requisiti extra (solo per questo script):
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    pip install spandrel
    curl -L -o RealESRGAN_x4.pth \
      https://huggingface.co/ai-forever/Real-ESRGAN/resolve/main/RealESRGAN_x4.pth
"""
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from spandrel import ModelLoader

ROOT = Path(__file__).resolve().parent
GRAFICA = ROOT / "sorgenti" / "grafica-golf.png"      # 941 x 1672
MODELLO = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "RealESRGAN_x4.pth"
OUT = ROOT / "materiali" / "golf-dettaglio-x4.jpg"

# Zona a destra del titolo: solo cielo, alberi, mazza, pallina e green (9:16).
RITAGLIO = (677, 0, 941, 470)

crop = Image.open(GRAFICA).convert("RGB").crop(RITAGLIO)
model = ModelLoader().load_from_file(str(MODELLO))
model.model.eval()
t = torch.from_numpy(np.asarray(crop, dtype=np.float32) / 255).permute(2, 0, 1)[None]
with torch.no_grad():
    o = model(t)[0].permute(1, 2, 0).clamp(0, 1).numpy()
Image.fromarray((o * 255).round().astype(np.uint8)).save(OUT, quality=95, subsampling=0)
print("Creato", OUT)
