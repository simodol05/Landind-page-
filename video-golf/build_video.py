#!/usr/bin/env python3
"""
Il Rustico - Reel "Golf alla Mandria" (1080x1920, 18 s, H.264).

Monta il video pubblicitario e la copertina partendo dai video originali
della suite e dal dettaglio golf ricavato dalla grafica promozionale.

Uso:
    python3 video-golf/build_video.py            # video + copertina
    python3 video-golf/build_video.py --anteprima 2.0 9.5 16.0   # solo fotogrammi PNG

Requisiti: ffmpeg (con zscale/libx264), Python 3 con Pillow e numpy.

File attesi:
    video-golf/sorgenti/IMG_6308.mov   camera (59.94 fps, SDR)
    video-golf/sorgenti/IMG_6399.mov   sauna, avvicinamento (HDR HLG)
    video-golf/sorgenti/IMG_6398.mov   sala sauna, panoramica (HDR HLG)
    video-golf/materiali/golf-dettaglio-x4.jpg   (creato da upscale_golf.py)

Per modificare testi, tempi o tagli basta intervenire sulle tabelle
SEGMENTI e TESTI qui sotto e rilanciare lo script.
"""
import argparse
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "sorgenti"
FONTS = ROOT / "fonts"
OUT_VIDEO = ROOT / "Il_Rustico_Golf_Mandria.mp4"
OUT_COVER = ROOT / "Il_Rustico_Golf_Mandria_copertina.jpg"
GOLF_STILL = ROOT / "materiali" / "golf-dettaglio-x4.jpg"

W, H, FPS = 1080, 1920, 30
DURATA = 18.0

IVORY = (246, 240, 228)
CHAMPAGNE = (214, 190, 140)

# Zone di sicurezza: 250 px in alto, 350 px in basso, comandi a destra.
SAFE_TOP, SAFE_BOTTOM = 250, H - 350
SAFE_LEFT, SAFE_RIGHT = 70, 930

# ---------------------------------------------------------------------------
# MONTAGGIO
# src_in: secondo del file sorgente che cade all'inizio del segmento.
# Ogni fotogramma sorgente diventa un fotogramma a 30 fps: IMG_6308 e' girato
# a 60 fps, quindi risulta rallentato al 50% senza fotogrammi duplicati.
# ---------------------------------------------------------------------------
SEGMENTI = [
    dict(nome="golf",       tipo="still",                         inizio=0.0,  fine=3.5),
    dict(nome="camera",     file="IMG_6308.mov", src_in=3.15,     inizio=3.5,  fine=7.0,
         zoom=1.15, ancora=(0.0, 0.5), hdr=False, eq="contrast=1.03:saturation=1.02"),
    dict(nome="sauna",      file="IMG_6399.mov", src_in=0.30,     inizio=7.0,  fine=11.0,
         hdr=True,  eq="gamma=1.06:saturation=1.06"),
    dict(nome="esperienza", file="IMG_6308.mov", src_in=6.75,     inizio=11.0, fine=14.0,
         hdr=False, eq="contrast=1.03:saturation=1.02"),
    dict(nome="finale",     file="IMG_6398.mov", src_in=1.85,     inizio=14.0, fine=18.0,
         hdr=True,  eq="gamma=1.06:saturation=1.06"),
]
# Brevi dissolvenze (in fotogrammi) sui soli tagli indicati; gli altri sono netti.
DISSOLVENZE = {3.5: 10, 14.0: 8}

# Velatura per la leggibilita' dei testi: (lato, y senza velo, y velo pieno, opacita')
VELATURE = {
    "golf":       ("top",    1250, 480, 0.80, (8, 22, 14)),
    "camera":     ("bottom", 950,  1450, 0.80, (16, 10, 10)),
    "sauna":      ("bottom", 950,  1450, 0.80, (10, 12, 16)),
    "esperienza": ("bottom", 950,  1450, 0.80, (16, 10, 10)),
    "finale":     ("bottom", 820,  1300, 0.86, (8, 14, 12)),
}


def font(nome, size):
    return ImageFont.truetype(str(FONTS / nome), size)


SERIF = "CormorantGaramond-600.ttf"
SERIF_M = "CormorantGaramond-500.ttf"
SERIF_I = "CormorantGaramond-500i.ttf"
SANS = "Montserrat-500.ttf"
SANS_B = "Montserrat-600.ttf"

# ---------------------------------------------------------------------------
# TESTI: ogni blocco compare con una breve salita in dissolvenza.
# righe: (testo, font, corpo, colore, spaziatura lettere)
# Un testo puo' essere una lista di pezzi [(testo, font, colore), ...] per
# mescolare stili sulla stessa riga.
# ---------------------------------------------------------------------------
X0 = 84
TESTI = [
    # 0 - 3.5  GANCIO
    dict(t_in=0.10, t_out=3.28, x=X0, y=262, righe=[
        ("Alla Mandria", SERIF, 118, IVORY, 0),
        ("per il golf", SERIF, 118, IVORY, 0)]),
    dict(t_in=0.55, t_out=3.28, x=X0, y=508, righe=[
        ("e non sai dove", SERIF, 118, IVORY, 0),
        ("soggiornare?", SERIF, 118, IVORY, 0)]),
    dict(t_in=1.20, t_out=3.28, x=X0 + 4, y=772, filetto=150),
    dict(t_in=1.30, t_out=3.28, x=X0 + 2, y=806, interlinea=1.42, righe=[
        ("International Cup EDGA", SANS_B, 40, IVORY, 1),
        ("1–2 ottobre 2026", SANS_B, 40, CHAMPAGNE, 1),
        ("Golf Torino – La Mandria", SANS, 40, IVORY, 1)]),
    dict(t_in=1.60, t_out=3.28, x=X0 + 2, y=1004, opacita=0.70, righe=[
        ("Immagine illustrativa", SANS, 24, IVORY, 1)]),

    # 3.5 - 7  CAMERA
    dict(t_in=3.80, t_out=6.78, x=X0, y=1268, righe=[
        ("Scopri Il Rustico", SERIF, 122, IVORY, 0)]),
    dict(t_in=4.25, t_out=6.78, x=X0 + 4, y=1420, filetto=120),
    dict(t_in=4.35, t_out=6.78, x=X0 + 2, y=1446, righe=[
        ("Suite per due · Ciriè", SANS, 44, CHAMPAGNE, 2)]),

    # 7 - 11  SAUNA
    dict(t_in=7.25, t_out=10.78, x=X0, y=1236, righe=[
        ("Dopo il green,", SERIF, 104, IVORY, 0)]),
    dict(t_in=7.75, t_out=10.78, x=X0, y=1350, righe=[
        ("una sauna tutta vostra.", SERIF_I, 96, IVORY, 0)]),

    # 11 - 14  ESPERIENZA
    dict(t_in=11.20, t_out=13.72, x=X0, y=1236, righe=[
        ("Trasforma la trasferta", SERIF, 96, IVORY, 0)]),
    dict(t_in=11.60, t_out=13.72, x=X0, y=1350, righe=[
        ("in una pausa per due.", SERIF_I, 96, IVORY, 0)]),

    # 14 - 18  INVITO
    dict(t_in=14.05, x="centro", y=1088, righe=[
        ("IL RUSTICO", SERIF_M, 120, IVORY, 9)]),
    dict(t_in=14.30, x="centro", y=1248, filetto=300),
    dict(t_in=14.35, x="centro", y=1268, righe=[
        ("Romantic Suite & Sauna", SERIF_I, 56, IVORY, 1)]),
    dict(t_in=14.50, x="centro", y=1392, pillola=True, righe=[
        ([("Scrivici ", SANS, IVORY), ("«GOLF»", SANS_B, CHAMPAGNE),
          (" per disponibilità", SANS, IVORY)], None, 40, None, 0)]),
]
CENTRO_X = 540
DUR_IN, DUR_OUT, SALITA = 0.60, 0.22, 30


# ---------------------------------------------------------------------------
# Rendering dei blocchi di testo
# ---------------------------------------------------------------------------
def larghezza(draw, pezzi, size, tracking):
    tot = 0
    for testo, fnome, _ in pezzi:
        f = font(fnome, size)
        if tracking:
            tot += sum(draw.textlength(c, font=f) + tracking for c in testo)
        else:
            tot += draw.textlength(testo, font=f)
    return tot - (tracking if tracking else 0)


def disegna_riga(draw, x, y, pezzi, size, tracking):
    for testo, fnome, col in pezzi:
        f = font(fnome, size)
        if tracking:
            for c in testo:
                draw.text((x, y), c, font=f, fill=col + (255,), anchor="ls")
                x += draw.textlength(c, font=f) + tracking
        else:
            draw.text((x, y), testo, font=f, fill=col + (255,), anchor="ls")
            x += draw.textlength(testo, font=f)


def rendi_blocco(b):
    """Restituisce (rgba numpy float premoltiplicato, x, y) del blocco."""
    pad = 60
    if "filetto" in b:
        w = b["filetto"]
        img = Image.new("RGBA", (w + 2 * pad, 3 + 2 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(img).rectangle([pad, pad, pad + w - 1, pad + 2], fill=CHAMPAGNE + (235,))
        x = b["x"] if b["x"] != "centro" else CENTRO_X - w // 2
        return img, x - pad, b["y"] - pad, w

    tmp = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    righe = []
    for testo, fnome, size, col, tr in b["righe"]:
        pezzi = testo if isinstance(testo, list) else [(testo, fnome, col)]
        asc = font(pezzi[0][1], size).getmetrics()[0]
        righe.append((pezzi, size, tr, larghezza(tmp, pezzi, size, tr), asc))
    inter = b.get("interlinea", 1.0)
    wmax = int(max(r[3] for r in righe))
    altezze = [int(r[1] * inter) for r in righe]
    hcont = sum(altezze)
    pill = b.get("pillola")
    px, py = (46, 30) if pill else (0, 0)
    wtot, htot = wmax + 2 * px, hcont + 2 * py
    img = Image.new("RGBA", (wtot + 2 * pad, htot + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if pill:
        d.rounded_rectangle([pad, pad, pad + wtot, pad + htot], radius=htot // 2,
                            fill=(10, 14, 12, 120), outline=CHAMPAGNE + (235,), width=3)
    y = pad + py
    for (pezzi, size, tr, w, asc), hh in zip(righe, altezze):
        x = pad + px + (0 if b["x"] != "centro" else (wmax - w) / 2)
        # linea di base a circa l'80% del corpo: la riga occupa [y, y + corpo]
        disegna_riga(d, x, y + size * 0.80, pezzi, size, tr)
        y += hh
    # ombra morbida per la leggibilita'
    alpha = img.getchannel("A")
    ombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ombra.putalpha(alpha.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.55)))
    stretta = Image.new("RGBA", img.size, (0, 0, 0, 0))
    stretta.putalpha(alpha.filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: int(v * 0.35)))
    base = Image.alpha_composite(ombra, stretta)
    if pill:  # niente ombra dura dentro la pillola
        base = ombra
    out = Image.alpha_composite(base, img)
    x = b["x"] if b["x"] != "centro" else CENTRO_X - wtot // 2
    return out, x - pad, b["y"] - pad, wtot


def premoltiplica(img):
    a = np.asarray(img, dtype=np.float32) / 255.0
    rgb = a[..., :3] * a[..., 3:4]
    return rgb, a[..., 3:4]


def prepara_testi():
    blocchi = []
    for b in TESTI:
        img, x, y, w = rendi_blocco(b)
        bx0 = x + 60
        bx1 = bx0 + w
        if bx0 < SAFE_LEFT or bx1 > SAFE_RIGHT or b["y"] < SAFE_TOP or y + img.size[1] - 60 > SAFE_BOTTOM:
            print(f"  ATTENZIONE: blocco fuori zona sicura x={bx0}-{bx1} y={b['y']}-{y + img.size[1] - 60}",
                  file=sys.stderr)
        rgb, a = premoltiplica(img)
        blocchi.append(dict(b, rgb=rgb, a=a, px=x, py=y))
    return blocchi


def ease_out(p):
    p = min(max(p, 0.0), 1.0)
    return 1 - (1 - p) ** 3


def componi_testi(frame, t, blocchi):
    for b in blocchi:
        if t < b["t_in"]:
            continue
        e = ease_out((t - b["t_in"]) / DUR_IN)
        alpha = e * b.get("opacita", 1.0)
        if b.get("t_out") is not None and t > b["t_out"]:
            alpha *= 1 - ease_out((t - b["t_out"]) / DUR_OUT)
        if alpha <= 0.002:
            continue
        rgb, a = b["rgb"], b["a"]
        dy = int(round((1 - e) * SALITA))
        if "filetto" in b:  # il filetto si allunga invece di salire
            dy = 0
            wv = int(round(60 + b["filetto"] * e))
            rgb, a = rgb[:, :wv], a[:, :wv]
        x0, y0 = b["px"], b["py"] + dy
        h, w = a.shape[:2]
        fx0, fy0, fx1, fy1 = max(x0, 0), max(y0, 0), min(x0 + w, W), min(y0 + h, H)
        sl = (slice(fy0 - y0, fy1 - y0), slice(fx0 - x0, fx1 - x0))
        reg = frame[fy0:fy1, fx0:fx1]
        reg *= 1 - a[sl] * alpha
        reg += rgb[sl] * alpha
    return frame


def velatura(nome):
    lato, y_zero, y_pieno, op, col = VELATURE[nome]
    y = np.arange(H, dtype=np.float32)
    p = np.clip((y - y_zero) / (y_pieno - y_zero), 0, 1)
    p = p * p * (3 - 2 * p)  # smoothstep
    m = (p * op)[:, None, None]
    colore = np.array(col, dtype=np.float32)[None, None, :] / 255.0
    return m, colore * m


# ---------------------------------------------------------------------------
# Sorgenti video
# ---------------------------------------------------------------------------
def info_fps(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=r_frame_rate", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True).stdout.strip()
    n, d = r.strip(",").split("/")
    return float(n) / float(d)


TONEMAP = ("zscale=t=linear:npl=203,format=gbrpf32le,zscale=p=bt709,"
           "tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p")


class LettoreClip:
    """Legge i fotogrammi di un segmento video, uno alla volta, come float RGB."""

    def __init__(self, seg, n_frames, pad_in):
        path = SRC / seg["file"]
        fps_src = info_fps(path)
        ss = max(seg["src_in"] - pad_in / fps_src, 0)
        # le sorgenti sono in 4K: un leggero zoom resta comunque un ridimensionamento
        z, ax, ay = seg.get("zoom", 1.0), *seg.get("ancora", (0.5, 0.5))
        vf = [f"scale={round(W * z / 2) * 2}:{round(H * z / 2) * 2}:flags=lanczos",
              f"crop={W}:{H}:(iw-{W})*{ax}:(ih-{H})*{ay}"]
        if seg.get("hdr"):
            vf.append(TONEMAP)
        if seg.get("eq"):
            vf.append("eq=" + seg["eq"])
        vf += ["setpts=N/(30*TB)", "format=rgb24"]
        cmd = ["ffmpeg", "-v", "error", "-ss", f"{ss:.4f}", "-i", str(path), "-an",
               "-vf", ",".join(vf), "-frames:v", str(n_frames), "-r", "30",
               "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:"]
        self.p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
        self.letti = 0
        self.ultimo = None
        self.n = n_frames

    def frame(self, i):
        while self.letti <= i:
            buf = self.p.stdout.read(W * H * 3)
            if len(buf) < W * H * 3:
                if self.ultimo is None:
                    raise RuntimeError("Nessun fotogramma dalla sorgente")
                print("  ATTENZIONE: sorgente piu' corta del previsto, ripeto l'ultimo fotogramma",
                      file=sys.stderr)
                self.letti += 1
                continue
            self.ultimo = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32) / 255.0
            self.letti += 1
        return self.ultimo

    def chiudi(self):
        self.p.stdout.close()
        self.p.wait()


class LettoreGolf:
    """Dettaglio golf con lento avvicinamento (sub-pixel, interpolazione bicubica)."""

    def __init__(self, n_frames):
        self.img = Image.open(GOLF_STILL).convert("RGB")
        self.n = n_frames
        iw, ih = self.img.size
        self.base = max(W / iw, H / ih)
        # punto verso cui avvicinarsi (frazione dell'immagine): la pallina
        self.fx, self.fy = 0.52, 0.62

    def frame(self, i):
        iw, ih = self.img.size
        p = i / max(self.n - 1, 1)
        z = self.base * (1.0 + 0.075 * (p * (2 - p) * 0.6 + p * 0.4))
        cw, ch = W / z, H / z
        cx = iw / 2 + (self.fx * iw - iw / 2) * (z / self.base - 1) * 1.2
        cy = ih / 2 + (self.fy * ih - ih / 2) * (z / self.base - 1) * 1.2
        x0 = min(max(cx - cw / 2, 0), iw - cw)
        y0 = min(max(cy - ch / 2, 0), ih - ch)
        out = self.img.transform((W, H), Image.AFFINE, (1 / z, 0, x0, 0, 1 / z, y0),
                                 resample=Image.BICUBIC)
        return np.asarray(out, dtype=np.float32) / 255.0

    def chiudi(self):
        pass


# ---------------------------------------------------------------------------
# Montaggio
# ---------------------------------------------------------------------------
def piano():
    segs = []
    for s in SEGMENTI:
        d_in = DISSOLVENZE.get(s["inizio"], 0)
        d_out = DISSOLVENZE.get(s["fine"], 0)
        pad_in, pad_out = d_in // 2, d_out - d_out // 2
        f0 = round(s["inizio"] * FPS) - pad_in
        f1 = round(s["fine"] * FPS) + pad_out
        segs.append(dict(s, f0=f0, f1=f1, pad_in=pad_in, lettore=None,
                         vel=velatura(s["nome"])))
    return segs


def apri(seg):
    n = seg["f1"] - seg["f0"]
    if seg.get("tipo") == "still":
        return LettoreGolf(n)
    return LettoreClip(seg, n, seg["pad_in"])


def fotogramma_segmento(seg, f, blocchi):
    if seg["lettore"] is None:
        seg["lettore"] = apri(seg)
    img = seg["lettore"].frame(f - seg["f0"]).copy()
    m, c = seg["vel"]
    img = img * (1 - m) + c
    return img


def peso_dissolvenza(f, segs):
    """Restituisce [(segmento, peso)] per il fotogramma f."""
    attivi = [s for s in segs if s["f0"] <= f < s["f1"]]
    if len(attivi) == 1:
        return [(attivi[0], 1.0)]
    a, b = attivi[0], attivi[1]
    d = DISSOLVENZE[b["inizio"]]
    start = round(b["inizio"] * FPS) - d // 2
    w = (f - start + 0.5) / d
    w = w * w * (3 - 2 * w)
    return [(a, 1 - w), (b, w)]


def rendi_fotogramma(f, segs, blocchi):
    t = f / FPS
    out = np.zeros((H, W, 3), np.float32)
    for seg, w in peso_dissolvenza(f, segs):
        out += fotogramma_segmento(seg, f, blocchi) * w
    componi_testi(out, t, blocchi)
    for s in segs:  # libera i lettori non piu' necessari
        if isinstance(s["lettore"], (LettoreClip, LettoreGolf)) and f >= s["f1"] - 1:
            s["lettore"].chiudi()
            s["lettore"] = "chiuso"
    return out


def a_uint8(frame):
    return (np.clip(frame, 0, 1) * 255 + 0.5).astype(np.uint8)


def esporta_video():
    blocchi = prepara_testi()
    segs = piano()
    n = round(DURATA * FPS)
    cmd = ["ffmpeg", "-v", "error", "-y",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:",
           "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
           "-map", "0:v", "-map", "1:a", "-t", f"{DURATA}",
           "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
           "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-profile:v", "high", "-level", "4.1",
           "-maxrate", "14M", "-bufsize", "28M", "-g", "60",
           "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
           "-color_range", "tv",
           "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(OUT_VIDEO)]
    enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for f in range(n):
        enc.stdin.write(a_uint8(rendi_fotogramma(f, segs, blocchi)).tobytes())
        if f % 60 == 0:
            print(f"  fotogramma {f}/{n}", flush=True)
    enc.stdin.close()
    if enc.wait() != 0:
        sys.exit("Errore nella codifica")
    print("Creato", OUT_VIDEO)


def anteprime(tempi):
    """Esporta singoli fotogrammi PNG per controllo rapido."""
    blocchi = prepara_testi()
    for t in tempi:
        segs = piano()
        img = rendi_fotogramma(int(round(t * FPS)), segs, blocchi)
        for s in segs:
            if isinstance(s["lettore"], LettoreClip):
                s["lettore"].p.kill()
        p = ROOT / f"anteprima_{t:05.2f}.png"
        Image.fromarray(a_uint8(img)).save(p)
        print("Creato", p)


# ---------------------------------------------------------------------------
# Copertina
# ---------------------------------------------------------------------------
def nitidezza(arr):
    g = arr.mean(axis=2)
    lap = g[1:-1, 1:-1] * 4 - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var())


def esporta_copertina():
    # sceglie il fotogramma piu' nitido nella parte con testiera, cuscini e orologio
    seg = dict(file="IMG_6308.mov", src_in=3.30, hdr=False, eq="contrast=1.03:saturation=1.02")
    let = LettoreClip(seg, 40, 0)
    migliore, score = None, -1
    for i in range(40):
        fr = let.frame(i)
        s = nitidezza(fr[::2, ::2])
        if s > score:
            migliore, score = fr.copy(), s
    let.p.kill()
    m, c = velatura("camera")
    img = migliore * (1 - m) + c
    blocchi = [
        dict(t_in=0, x=X0, y=1190, righe=[("Golf alla Mandria?", SERIF, 108, IVORY, 0)]),
        dict(t_in=0, x=X0, y=1318, righe=[("Ecco dove soggiornare.", SERIF_I, 104, IVORY, 0)]),
        dict(t_in=0, x=X0 + 4, y=1462, filetto=120),
        dict(t_in=0, x=X0 + 2, y=1486, righe=[("IL RUSTICO · Romantic Suite & Sauna", SANS, 32, CHAMPAGNE, 2)]),
    ]
    TESTI_BAK = list(TESTI)
    TESTI[:] = blocchi
    try:
        bl = prepara_testi()
    finally:
        TESTI[:] = TESTI_BAK
    componi_testi(img, 10.0, bl)
    Image.fromarray(a_uint8(img)).save(OUT_COVER, quality=93, subsampling=0, optimize=True)
    print("Creato", OUT_COVER)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--anteprima", nargs="*", type=float)
    ap.add_argument("--solo-copertina", action="store_true")
    a = ap.parse_args()
    if a.anteprima:
        anteprime(a.anteprima)
    elif a.solo_copertina:
        esporta_copertina()
    else:
        esporta_video()
        esporta_copertina()
