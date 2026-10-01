# Reel «Golf alla Mandria» — Il Rustico

Video per Instagram Reels e TikTok pensato per chi viene alla
Giovanni Nasi & Arval Argenti International Cup EDGA (1–2 ottobre 2026,
Circolo Golf Torino – La Mandria).

| File | Cosa contiene |
|---|---|
| `Il_Rustico_Golf_Mandria.mp4` | Video finale 1080×1920, 18 s, 30 fps, H.264 High, traccia audio muta (la musica si aggiunge nell'app) |
| `Il_Rustico_Golf_Mandria_copertina.jpg` | Copertina verticale 1080×1920 |
| `build_video.py` | Script di montaggio: tagli, testi, tempi, colori |
| `upscale_golf.py` | Ritaglio e ingrandimento del dettaglio golf dalla grafica |
| `materiali/golf-dettaglio-x4.jpg` | Dettaglio golf già ingrandito (fotogramma di partenza dell'animazione) |
| `materiali/golf-colpo.mp4` | Colpo di golf animato con IA (Higgsfield · Kling 3.0) dal dettaglio golf |
| `fonts/` | Cormorant Garamond e Montserrat (licenza SIL OFL) |

## Sequenza

| Tempo | Ripresa | Testo |
|---|---|---|
| 0–3,5 s | Colpo di golf animato con IA a partire dalla grafica (illustrativo, con dicitura «Animazione illustrativa (IA)») | Alla Mandria per il golf / e non sai dove soggiornare? · International Cup EDGA, 1–2 ottobre 2026, Golf Torino – La Mandria |
| 3,5–7 s | IMG_6308, testiera e cuscini (girato a 60 fps → rallentato al 50%) | Scopri Il Rustico · Suite per due · Ciriè |
| 7–11 s | IMG_6399, avvicinamento alla sauna accesa | Dopo il green, / una sauna tutta vostra. |
| 11–14 s | IMG_6308, letto con asciugamani e petali (rallentato al 50%) | Trasforma la trasferta / in una pausa per due. |
| 14–18 s | IMG_6398, panoramica sulla sala sauna | IL RUSTICO · Romantic Suite & Sauna · Scrivici «GOLF» per disponibilità |

Le riprese della sauna sono HDR (HLG) e vengono convertite in SDR con tone mapping.
I testi restano fuori da 250 px in alto, 350 px in basso e dalla colonna dei comandi a destra.

## Rigenerare il video

1. Copia i video originali in `video-golf/sorgenti/` con i nomi `IMG_6308.mov`,
   `IMG_6398.mov`, `IMG_6399.mov` (la cartella è esclusa dal repository).
2. `pip install pillow numpy` (serve anche `ffmpeg`).
3. `python3 video-golf/build_video.py`

Per provare una modifica senza esportare tutto:
`python3 video-golf/build_video.py --anteprima 2.0 9.5 16.0` crea dei PNG dei singoli istanti.

Testi, tempi di comparsa, punti di attacco delle riprese e dissolvenze sono nelle
tabelle `SEGMENTI`, `DISSOLVENZE` e `TESTI` all'inizio di `build_video.py`.

## Parametri approvati (da mantenere nelle prossime modifiche)

**Apertura golf — approvata così com'è, non modificare:**
- Clip `materiali/golf-colpo.mp4` (Kling 3.0 via Higgsfield, versione B: la mazza colpisce la pallina con la faccia), partenza dal fotogramma `golf-dettaglio-x4.jpg`.
- Attacco `src_in = 0.50` s, durata 0–3,5 s; clip a 24 fps letto fotogramma per fotogramma a 30 fps (azione ×1,25, impatto a circa 1,4 s).
- Velo in alto verde scuro `(8, 22, 14)`, opacità 0,80, da y 480 (pieno) a y 1250 (nullo).
- Testi: titolo a 0,10 s e 0,55 s; filetto 1,65 s; info evento 1,75 s; «Animazione illustrativa (IA)» 1,95 s; uscita 3,28 s.
- Dissolvenza golf → camera di 10 fotogrammi.

**Video della suite — velo in basso leggero:**
- Camera, sauna, esperienza: opacità 0,42, sfumatura da y 1000 (nullo) a y 1500 (pieno).
- Finale con invito: opacità 0,50, sfumatura da y 900 a y 1400.
- La copertina usa lo stesso velo della camera.
