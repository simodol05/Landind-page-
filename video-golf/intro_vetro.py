#!/usr/bin/env python3
"""
Il Rustico - Intro «colpo verso lo schermo + vetro rotto 3D».

La mazza colpisce la pallina verso chi guarda; all'impatto lo schermo si
incrina a ragnatela e le schegge si staccano in prospettiva, cadendo verso
lo spettatore. Dietro il vetro resta uno sfondo da sostituire con la suite.

Esporta in video-golf/:
    Il_Rustico_Intro_Vetro_chroma_blu.mp4   sfondo blu pieno: in CapCut/InShot
                                            usa «Chroma key» sul blu e metti
                                            sotto il video della suite
    Il_Rustico_Intro_Vetro_trasparente.mov  ProRes 4444 con canale alfa
                                            (Premiere, Final Cut, DaVinci)
    Il_Rustico_Intro_Vetro_anteprima.mp4    anteprima con la camera del Rustico
                                            dietro il vetro

Uso:
    python3 video-golf/intro_vetro.py
    python3 video-golf/intro_vetro.py --anteprima 2.4 2.8 3.2   # PNG di controllo

Le schegge sono piani 3D: ogni scheggia viene ruotata, spostata e proiettata
in prospettiva, e la sua immagine e' deformata con l'omografia esatta.
"""
import argparse
import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_video as bv  # noqa: E402  (testi, font, lettori video)

ROOT = bv.ROOT
W, H, FPS = bv.W, bv.H, bv.FPS

# ---------------------------------------------------------------------------
# PARAMETRI
# ---------------------------------------------------------------------------
CLIP = "materiali/golf-verso-schermo.mp4"   # colpo verso la camera (Kling 3.0, versione D)
# Tempo del clip: swing a velocita' x1,25 fino a T_ACCEL, poi il volo della
# pallina accelera dolcemente fino a S_IMPATTO (pallina che riempie lo schermo).
T_ACCEL = 1.20         # s dell'intro in cui il volo inizia ad accelerare
S_IMPATTO = 4.65       # s del clip in cui la pallina "tocca" lo schermo
VEL0 = 1.25            # velocita' iniziale (24 fps letti a 30 fps)
T_IMPATTO = 2.95       # s dell'intro in cui avviene l'impatto
IMPATTO = (560, 880)   # punto d'impatto sullo schermo (px), centro della pallina
T_CREPA = 0.16         # durata della propagazione delle crepe
T_TENUTA = 0.30        # vetro incrinato fermo prima di cedere
T_CADUTA = 1.25        # caduta delle schegge
CODA = 0.35            # sfondo libero alla fine
SEME = 7

CHROMA = np.array([0, 40, 255], np.float32) / 255.0   # blu chroma key

FOCALE = 1500.0        # prospettiva: distanza della «camera» dal vetro (px)
GRAVITA = 3400.0       # px/s^2

OUT_BLU = ROOT / "Il_Rustico_Intro_Vetro_chroma_blu.mp4"
OUT_ALFA = ROOT / "Il_Rustico_Intro_Vetro_trasparente.mov"
OUT_PREV = ROOT / "Il_Rustico_Intro_Vetro_anteprima.mp4"

# Testi del gancio (approvati): compaiono sul colpo e si rompono con il vetro.
# Le info evento escono prima che la pallina bianca ci passi sotto.
TESTI = [
    dict(t_in=0.10, x=bv.X0, y=262, righe=[
        ("Alla Mandria", bv.SERIF, 118, bv.IVORY, 0),
        ("per il golf", bv.SERIF, 118, bv.IVORY, 0)]),
    dict(t_in=0.55, x=bv.X0, y=508, righe=[
        ("e non sai dove", bv.SERIF, 118, bv.IVORY, 0),
        ("soggiornare?", bv.SERIF, 118, bv.IVORY, 0)]),
    dict(t_in=1.05, t_out=2.30, x=bv.X0 + 4, y=772, filetto=150),
    dict(t_in=1.15, t_out=2.30, x=bv.X0 + 2, y=806, interlinea=1.42, righe=[
        ("International Cup EDGA", bv.SANS_B, 40, bv.IVORY, 1),
        ("1–2 ottobre 2026", bv.SANS_B, 40, bv.CHAMPAGNE, 1),
        ("Golf Torino – La Mandria", bv.SANS, 40, bv.IVORY, 1)]),
    dict(t_in=1.35, t_out=2.30, x=bv.X0 + 2, y=1004, opacita=0.70, righe=[
        ("Animazione illustrativa (IA)", bv.SANS, 24, bv.IVORY, 1)]),
]

rng = np.random.default_rng(SEME)


# ---------------------------------------------------------------------------
# Geometria della rottura: ragnatela di raggi e anelli irregolari
# ---------------------------------------------------------------------------
SEGMENTI_CREPE = []


def crea_ragnatela():
    cx, cy = IMPATTO
    n_raggi = 15
    # angoli quasi regolari, con un po' di disordine
    base = np.linspace(0, 2 * math.pi, n_raggi, endpoint=False) + rng.uniform(-0.17, 0.17, n_raggi)
    raggi_r = [0, 34, 95, 190, 320, 500, 740, 1060, 1500, 2300]
    # punti: per ogni anello e raggio, con piccole deviazioni (crepe non rettilinee)
    P = np.zeros((len(raggi_r), n_raggi, 2), np.float32)
    for i, r in enumerate(raggi_r):
        for j, a in enumerate(base):
            aa = a + (rng.uniform(-0.09, 0.09) if i > 0 else 0)
            rr = r * (1 + (rng.uniform(-0.13, 0.13) if i > 0 else 0))
            P[i, j] = (cx + rr * math.cos(aa), cy + rr * math.sin(aa))
    celle = []
    # crepe visibili: (inizio, fine, peso, spessore) — radiali marcate, anelli e diagonali sottili
    segs = []
    for i in range(len(raggi_r) - 1):
        for j in range(n_raggi):
            j2 = (j + 1) % n_raggi
            segs.append((P[i, j] if i else P[0, 0], P[i + 1, j], 0.95, 2))
            if i > 0 and rng.random() < 0.75:
                segs.append((P[i, j], P[i, j2], 0.55, 1))
            if i == 0:
                poly = [P[0, 0], P[1, j], P[1, j2]]
                celle.append(np.array(poly))
                continue
            a, b, c, d = P[i, j], P[i + 1, j], P[i + 1, j2], P[i, j2]
            if rng.random() < 0.45:  # alcune celle spezzate in due triangoli
                if rng.random() < 0.5:
                    celle += [np.array([a, b, c]), np.array([a, c, d])]
                    segs.append((a, c, 0.45, 1))
                else:
                    celle += [np.array([a, b, d]), np.array([b, c, d])]
                    segs.append((b, d, 0.45, 1))
            else:
                celle.append(np.array([a, b, c, d]))
    SEGMENTI_CREPE[:] = segs
    # tieni solo le celle che toccano lo schermo
    out = []
    for poly in celle:
        x0, y0 = poly.min(0)
        x1, y1 = poly.max(0)
        if x1 < 0 or y1 < 0 or x0 > W or y0 > H:
            continue
        out.append(poly.astype(np.float32))
    return out, P


def disegna_crepe(img, P, progresso, poligoni):
    """Linee di crepa sopra l'immagine (float RGB 0-1), con propagazione radiale."""
    cx, cy = IMPATTO
    rmax = progresso * 1900
    lay = np.zeros((H, W), np.float32)
    ombra = np.zeros((H, W), np.float32)

    def linea(p, q, spessore, peso=1.0):
        d = min(math.hypot(*(p - (cx, cy))), math.hypot(*(q - (cx, cy))))
        if d > rmax:
            return
        peso = peso * (1 - 0.5 * min(d / 1400, 1))  # crepe piu' tenui lontano dall'impatto
        a = tuple(int(v * 16) for v in p)
        b = tuple(int(v * 16) for v in q)
        cv2.line(lay, a, b, peso, spessore, cv2.LINE_AA, shift=4)
        a2 = tuple(int((v + 1.5) * 16) for v in p)
        b2 = tuple(int((v + 1.5) * 16) for v in q)
        cv2.line(ombra, a2, b2, peso, spessore + 1, cv2.LINE_AA, shift=4)

    rj = np.random.default_rng(SEME + 2)
    for p, q, peso, spess in SEGMENTI_CREPE:
        # crepa frastagliata: il segmento viene spezzato con piccole deviazioni laterali
        L = math.hypot(*(q - p))
        k = max(1, int(L / 45))
        nrm = np.array([-(q - p)[1], (q - p)[0]], np.float32) / max(L, 1)
        pts = [p + (q - p) * (m / k) + (nrm * rj.normal(0, 2.2) if 0 < m < k else 0) for m in range(k + 1)]
        for m in range(k):
            linea(np.asarray(pts[m], np.float32), np.asarray(pts[m + 1], np.float32), spess, peso)
    # stella d'impatto: tante crepe corte e un alone bianco
    if progresso > 0:
        for k in range(26):
            a = rng_stella[k, 0]
            l = 30 + rng_stella[k, 1] * 120
            p = np.array([cx, cy], np.float32)
            q = p + l * np.array([math.cos(a), math.sin(a)], np.float32)
            linea(p, q, 1, 0.7)
        cv2.circle(lay, (int(cx), int(cy)), 26, 0.9, -1, cv2.LINE_AA)
    lay = cv2.GaussianBlur(lay, (0, 0), 0.6)
    alone = cv2.GaussianBlur(lay, (0, 0), 6) * 0.35
    ombra = cv2.GaussianBlur(ombra, (0, 0), 1.2) * 0.45
    img *= (1 - ombra[..., None])
    img += (1 - img) * np.clip(lay + alone, 0, 1)[..., None] * 0.92
    return img


rng_stella = np.random.default_rng(SEME + 1).uniform(0, 1, (26, 2)) * np.array([2 * math.pi, 1])


# ---------------------------------------------------------------------------
# Schegge 3D
# ---------------------------------------------------------------------------
def rot(axis, ang):
    axis = axis / np.linalg.norm(axis)
    K = np.array([[0, -axis[2], axis[1]], [axis[2], 0, -axis[0]], [-axis[1], axis[0], 0]])
    return np.eye(3) + math.sin(ang) * K + (1 - math.cos(ang)) * (K @ K)


def prepara_schegge(poligoni):
    cx, cy = IMPATTO
    dmax = math.hypot(max(cx, W - cx), max(cy, H - cy))
    sch = []
    for poly in poligoni:
        c = poly.mean(0)
        d = math.hypot(c[0] - cx, c[1] - cy)
        u = np.array([c[0] - cx, c[1] - cy]) / max(d, 1)
        vicino = 1 - min(d / dmax, 1)
        sch.append(dict(
            poly=poly, c=c,
            ritardo=(d / dmax) * 0.30 + rng.uniform(0, 0.07),
            v=np.array([u[0] * rng.uniform(150, 520), u[1] * rng.uniform(150, 520) - rng.uniform(0, 260),
                        -rng.uniform(250, 700) * (0.5 + vicino)]),
            asse=rng.normal(size=3) * np.array([1, 1, 0.35]),
            omega=rng.uniform(1.8, 6.5) * (0.6 + vicino),
            # piccola inclinazione appena il vetro si incrina: riflessi irregolari
            incl=rot(rng.normal(size=3) * np.array([1, 1, 0.2]), rng.uniform(0.03, 0.08) * (0.4 + vicino)),
            luce=rng.uniform(0.9, 1.1),   # ogni frammento riflette in modo un po' diverso
        ))
    return sch


def proietta(p3):
    s = FOCALE / (FOCALE + p3[..., 2])
    return np.stack([W / 2 + (p3[..., 0] - W / 2) * s, H / 2 + (p3[..., 1] - H / 2) * s], -1)


def prepara_texture(sch, tex_rgb):
    """Ritaglia una volta per tutte la texture premoltiplicata di ogni scheggia."""
    for s in sch:
        x0, y0 = np.floor(np.maximum(s["poly"].min(0), 0)).astype(int)
        x1, y1 = np.ceil(np.minimum(s["poly"].max(0), [W, H])).astype(int)
        x1, y1 = max(x1, x0 + 2), max(y1, y0 + 2)
        mask = np.zeros((y1 - y0, x1 - x0), np.float32)
        pts = np.round((s["poly"] - (x0, y0)) * 16).astype(np.int32)
        cv2.fillPoly(mask, [pts], 1.0, cv2.LINE_AA, shift=4)
        s["crop"] = np.dstack([tex_rgb[y0:y1, x0:x1] * mask[..., None], mask])
        s["orig"] = np.array([x0, y0], np.float32)
        s["quad"] = np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], np.float32)


LUCE = np.array([0.35, -0.55, -0.75]) / np.linalg.norm([0.35, -0.55, -0.75])


def componi_schegge(sch, tau):
    """(rgb premoltiplicato, alfa) del vetro dopo tau secondi dall'inizio della caduta."""
    acc_rgb = np.zeros((H, W, 3), np.float32)
    acc_a = np.zeros((H, W, 1), np.float32)
    voci = []
    for s in sch:
        t = max(tau - s["ritardo"], 0.0)
        R = rot(s["asse"], s["omega"] * t) @ s["incl"]
        T = s["v"] * t + np.array([0, 0.5 * GRAVITA * t * t, 0])
        q3 = np.concatenate([s["quad"] - s["c"], np.zeros((4, 1), np.float32)], 1) @ R.T
        q3 = q3 + np.array([s["c"][0], s["c"][1], 0]) + T
        if (FOCALE + q3[:, 2]).min() < 250:
            continue
        dst = proietta(q3).astype(np.float32)
        bx0, by0 = np.floor(np.maximum(dst.min(0), 0)).astype(int)
        bx1, by1 = np.ceil(np.minimum(dst.max(0), [W, H])).astype(int)
        if bx1 - bx0 < 2 or by1 - by0 < 2:
            continue
        voci.append((q3[:, 2].mean(), dst, (bx0, by0, bx1, by1), R @ np.array([0, 0, 1.0]), s))
    for _, dst, (bx0, by0, bx1, by1), n, s in sorted(voci, key=lambda v: -v[0]):
        src = (s["quad"] - s["orig"]).astype(np.float32)
        Hm = cv2.getPerspectiveTransform(src, (dst - (bx0, by0)).astype(np.float32))
        w = cv2.warpPerspective(s["crop"], Hm, (bx1 - bx0, by1 - by0), flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        a = w[..., 3:4]
        # luce: la scheggia si scurisce quando si inclina e riflette quando incontra la luce
        diff = (0.74 + 0.26 * abs(n[2])) * s["luce"]
        spec = max(0.0, float(np.dot(n, -LUCE))) ** 16 * 0.6
        prgb = w[..., :3] * diff + spec * a
        # bordo luminoso: lo spessore del vetro
        bordo = np.zeros(a.shape[:2], np.float32)
        pts = cv2.perspectiveTransform((s["poly"] - s["orig"]).astype(np.float32)[None], Hm)[0]
        cv2.polylines(bordo, [np.round(pts * 16).astype(np.int32)], True, 1.0, 2, cv2.LINE_AA, shift=4)
        bordo = bordo[..., None] * min(0.55 + spec, 1.0)
        prgb = prgb + bordo * (1 - prgb)
        a2 = np.clip(a + bordo * 0.5, 0, 1)
        sl = (slice(by0, by1), slice(bx0, bx1))
        acc_rgb[sl] = acc_rgb[sl] * (1 - a2) + prgb
        acc_a[sl] = acc_a[sl] * (1 - a2) + a2
    return np.clip(acc_rgb, 0, 1), acc_a


# ---------------------------------------------------------------------------
# Sequenza
# ---------------------------------------------------------------------------
def tempo_clip(t):
    """Secondo del clip mostrato al secondo t dell'intro (swing x1,25, poi volo in accelerazione)."""
    if t <= T_ACCEL:
        return VEL0 * t
    u, U = t - T_ACCEL, T_IMPATTO - T_ACCEL
    s0 = VEL0 * T_ACCEL
    k = (S_IMPATTO - s0 - VEL0 * U) / (U * U)
    return s0 + VEL0 * u + k * u * u


class LettoreRemap:
    """Carica il clip in memoria e restituisce il fotogramma a un tempo qualsiasi
    (fusione dei due fotogrammi vicini quando il tempo cade in mezzo)."""

    def __init__(self, percorso):
        path = ROOT / percorso
        self.fps = bv.info_fps(path)
        cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-an", "-vf",
               f"scale={W}:{H}:flags=lanczos,format=rgb24", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:"]
        raw = subprocess.run(cmd, capture_output=True, check=True).stdout
        self.f = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)

    def at(self, s):
        x = min(max(s * self.fps, 0), len(self.f) - 1)
        i = int(math.floor(x))
        a = x - i
        f0 = self.f[i].astype(np.float32) / 255
        if a < 0.02 or i + 1 >= len(self.f):
            return f0
        return f0 * (1 - a) + self.f[i + 1].astype(np.float32) / 255 * a


def scuoti(img, t):
    """Piccolo tremolio della «camera» subito dopo l'impatto."""
    if t < 0 or t > 0.35:
        return img
    amp = 14 * math.exp(-t * 12)
    dx = amp * math.sin(t * 95)
    dy = amp * math.cos(t * 77) * 0.7
    M = np.float32([[1.012, 0, dx - W * 0.006], [0, 1.012, dy - H * 0.006]])
    return cv2.warpAffine(img, M, (W, H), borderMode=cv2.BORDER_REFLECT)


def genera(tempi=None):
    durata = T_IMPATTO + T_CREPA + T_TENUTA + T_CADUTA + CODA
    n = int(round(durata * FPS))
    f_imp = int(round(T_IMPATTO * FPS))
    t_caduta0 = f_imp / FPS + T_CREPA + T_TENUTA

    blocchi = []
    bak = list(bv.TESTI)
    bv.TESTI[:] = TESTI
    try:
        blocchi = bv.prepara_testi()
    finally:
        bv.TESTI[:] = bak

    poligoni, P = crea_ragnatela()
    sch = prepara_schegge(poligoni)

    golf = LettoreRemap(CLIP)
    m_vel, c_vel = bv.velatura("golf")   # velo verde in alto, come approvato
    suite = bv.LettoreClip(dict(file="IMG_6308.mov", src_in=3.15, zoom=1.15, ancora=(0.0, 0.5),
                                hdr=False, eq="contrast=1.03:saturation=1.02"),
                           n - f_imp + 5, 0)

    frames = range(n) if tempi is None else [int(round(t * FPS)) for t in tempi]
    uscite = []
    if tempi is None:
        uscite = [apri_uscita(OUT_BLU, "blu"), apri_uscita(OUT_ALFA, "alfa"), apri_uscita(OUT_PREV, "prev")]

    tex = None
    pieno = np.ones((H, W, 1), np.float32)
    for f in frames:
        t = f / FPS
        if f <= f_imp:
            img = golf.at(tempo_clip(t)) * (1 - m_vel) + c_vel
            bv.componi_testi(img, t, blocchi)
            if f == f_imp:
                tex = img.copy()
        elif tex is None:  # anteprima di un istante dopo l'impatto
            img = golf.at(S_IMPATTO) * (1 - m_vel) + c_vel
            bv.componi_testi(img, T_IMPATTO, blocchi)
            tex = img.copy()
        premolt = t >= t_caduta0
        if f < f_imp:
            vetro_rgb, vetro_a = img, pieno
        elif not premolt:
            # vetro incrinato: crepe che si propagano, lampo e tremolio
            tc = (f - f_imp) / FPS
            pr = min(max(tc / T_CREPA, 0.0), 1.0)
            img = disegna_crepe(tex.copy(), P, pr ** 0.6, poligoni)
            if pr >= 1.0:  # frammenti appena inclinati sopra il vetro incrinato
                if "crop" not in sch[0]:
                    prepara_texture(sch, disegna_crepe(tex.copy(), P, 1.0, poligoni))
                v_rgb, v_a = componi_schegge(sch, 0.0)
                img = v_rgb + img * (1 - v_a)
            img = img + (1 - img) * max(0.0, 1 - tc / 0.10) * 0.35
            vetro_rgb, vetro_a = scuoti(img, tc), pieno
        else:
            if "crop" not in sch[0]:
                prepara_texture(sch, disegna_crepe(tex.copy(), P, 1.0, poligoni))
            vetro_rgb, vetro_a = componi_schegge(sch, t - t_caduta0)
        sotto = suite.frame(f - f_imp) if f >= f_imp else None
        blu = composita(vetro_rgb, vetro_a, np.broadcast_to(CHROMA, (H, W, 3)), premolt)
        prev = composita(vetro_rgb, vetro_a, sotto, premolt) if sotto is not None else blu
        if tempi is not None:
            for nome, im in (("anteprima", prev), ("blu", blu)):
                p = ROOT / f"vetro_{nome}_{t:05.2f}.png"
                cv2.imwrite(str(p), cv2.cvtColor(bv.a_uint8(im), cv2.COLOR_RGB2BGR))
            continue
        rgb_dritto = np.clip(vetro_rgb / np.maximum(vetro_a, 1e-4), 0, 1) if premolt else vetro_rgb
        alfa = np.dstack([rgb_dritto, vetro_a])
        uscite[0].stdin.write(bv.a_uint8(blu).tobytes())
        uscite[1].stdin.write((np.clip(alfa, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
        uscite[2].stdin.write(bv.a_uint8(prev).tobytes())
        if f % 15 == 0:
            print(f"  fotogramma {f}/{n}", flush=True)
    for u in uscite:
        u.stdin.close()
        u.wait()
    if tempi is None:
        for p in (OUT_BLU, OUT_ALFA, OUT_PREV):
            print("Creato", p)


def composita(rgb, a, fondo, premolt):
    if premolt:
        return rgb + fondo * (1 - a)
    return rgb * a + fondo * (1 - a)


def apri_uscita(path, tipo):
    base = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-s", f"{W}x{H}", "-r", str(FPS)]
    if tipo == "alfa":
        cmd = base + ["-pix_fmt", "rgba", "-i", "pipe:", "-c:v", "prores_ks", "-profile:v", "4444",
                      "-pix_fmt", "yuva444p10le", "-vendor", "apl0", str(path)]
    else:
        cmd = base + ["-pix_fmt", "rgb24", "-i", "pipe:",
                      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a",
                      "-shortest", "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                      "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-profile:v", "high",
                      "-level", "4.1", "-colorspace", "bt709", "-color_primaries", "bt709",
                      "-color_trc", "bt709", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
                      str(path)]
    return subprocess.Popen(cmd, stdin=subprocess.PIPE)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--anteprima", nargs="*", type=float)
    a = ap.parse_args()
    genera(a.anteprima)
