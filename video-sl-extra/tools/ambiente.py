"""Ricava l'ambiente pulito (remotion/public/ambiente.png) dal video KnowledgeDesk originale.

Si usa il fotogramma a 24,6 s del file KnowledgeDesk-SL-HOLDING-TESTI-MODIFICATI-29s.mp4
(ramo claude/knowledgedesk-video-text-replace-99tfq7): schermo nero, piè di pagina gia'
sparito, titoli quasi assenti. Le due scritte residue (occhiello "REALIZZATO DA SL HOLDING"
e un "Le" in dissolvenza) vengono coperte con la stessa texture presa poco piu' in basso,
allineata al passo delle veneziane. Nessuna immagine generata.

uso: python3 tools/ambiente.py <video KnowledgeDesk 29s>
"""
import subprocess
import sys

import cv2
import numpy as np

src = sys.argv[1]
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '24.6', '-i', src, '-frames:v', '1', '/tmp/kd_24_6.png'], check=True)
im = cv2.imread('/tmp/kd_24_6.png').astype(np.float32)


def best_dy(x0, x1, y0, y1, rng):
    res = []
    for dy in rng:
        ref = np.concatenate([im[y0 - 10:y0, x0:x1].ravel(), im[y1:y1 + 8, x0:x1].ravel()])
        c = np.concatenate([im[y0 - 10 + dy:y0 + dy, x0:x1].ravel(), im[y1 + dy:y1 + 8 + dy, x0:x1].ravel()])
        res.append((np.abs(ref - c).mean(), dy))
    return min(res)[1]


def patch(img, x0, x1, y0, y1, dy, feather=6):
    m = np.zeros(img.shape[:2], np.float32)
    m[y0:y1, x0:x1] = 1
    m = np.clip(cv2.GaussianBlur(m, (0, 0), feather) * 1.6, 0, 1)[..., None]
    return img * (1 - m) + np.roll(img, -dy, axis=0) * m


for box in [(80, 195, 258, 346), (70, 520, 168, 210)]:
    im = patch(im, *box, best_dy(*box, range(40, 140)))
cv2.imwrite('remotion/public/ambiente.png', np.clip(im, 0, 255).astype(np.uint8))
print('ok remotion/public/ambiente.png')
