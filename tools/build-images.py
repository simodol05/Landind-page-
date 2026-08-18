#!/usr/bin/env python3
"""
Il Rustico - generatore immagini ottimizzate per la landing page.

Prende le fotografie originali da  foto-originali/  e produce le versioni
ritagliate, ridimensionate e compresse (WebP + JPEG) dentro  assets/img/.

Uso:
    python3 tools/build-images.py

Per aggiungere una nuova fotografia: mettila in foto-originali/,
aggiungi una voce nel dizionario ASSETS qui sotto e rilancia lo script.
"""
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "foto-originali"
OUT = ROOT / "assets" / "img"
OUT.mkdir(parents=True, exist_ok=True)

SUITE = "suite-romantica.jpg"   # 969 x 1293
SAUNA = "sauna.jpg"             # 1086 x 1448

# nome-output: (file sorgente, box di ritaglio o None, larghezze da generare)
ASSETS = {
    "hero-suite":          (SUITE, None,                    [969, 700, 480]),
    "sogno-damore":        (SUITE, (330, 180, 969, 1000),   [639, 480]),
    "letto-petali":        (SUITE, (300, 560, 969, 900),    [669, 480]),
    "asciugamani-petali":  (SUITE, (20, 640, 900, 1180),    [880, 560]),
    "risveglio":           (SUITE, (0, 150, 760, 910),      [760, 520]),
    "sauna-verticale":     (SAUNA, None,                    [1086, 760, 520]),
    "sauna-infrarossi":    (SAUNA, (400, 660, 1086, 1110),  [686, 480]),
    "dettaglio-neon":      (SUITE, (500, 150, 920, 870),    [420]),
}

# immagine di anteprima per la condivisione del link (Airbnb, WhatsApp, ecc.)
OG = (SUITE, (0, 380, 969, 889), (1200, 630))

WEBP_Q = 82
JPEG_Q = 80


def prepare(img, width):
    """Ridimensiona con LANCZOS e applica una micro-nitidezza di compensazione."""
    if img.width == width:
        out = img.copy()
    else:
        height = round(img.height * width / img.width)
        out = img.resize((width, height), Image.Resampling.LANCZOS)
        out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=45, threshold=3))
    return out


def save(img, stem, width):
    img.save(OUT / f"{stem}-{width}.webp", "WEBP", quality=WEBP_Q, method=6)
    img.save(OUT / f"{stem}-{width}.jpg", "JPEG", quality=JPEG_Q,
             optimize=True, progressive=True)


def main():
    cache = {}
    for name, (src, box, widths) in ASSETS.items():
        if src not in cache:
            cache[src] = Image.open(SRC / src).convert("RGB")
        base = cache[src].crop(box) if box else cache[src]
        for w in widths:
            if w > base.width:
                print(f"  ! salto {name}-{w}: sorgente larga solo {base.width}px")
                continue
            save(prepare(base, w), name, w)
        print(f"  ok {name}  ({base.width}x{base.height}) -> {widths}")

    src, box, (ow, oh) = OG
    og = cache[src].crop(box).resize((ow, oh), Image.Resampling.LANCZOS)
    og = og.filter(ImageFilter.UnsharpMask(radius=0.8, percent=55, threshold=3))
    og.save(OUT / "anteprima-condivisione.jpg", "JPEG", quality=84,
            optimize=True, progressive=True)
    print(f"  ok anteprima-condivisione ({ow}x{oh})")

    total = sum(f.stat().st_size for f in OUT.iterdir() if f.is_file())
    print(f"\nTotale assets/img/: {total/1024:.0f} KB")


if __name__ == "__main__":
    main()
