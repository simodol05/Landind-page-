# SL — Reel "Landing servizi extra" (Il Rustico)

**File finale:** `SL_Landing_Rustico_Reel.mp4` — 1080×1920 (9:16), 30 fps, 34 s, H.264 High (yuv420p, BT.709) + AAC stereo 48 kHz, −14 LUFS.

## Struttura
| Cartella / file | Contenuto |
|---|---|
| `capture/` | Ripresa frame per frame della landing **reale** (Playwright + Chromium). `shots.mjs` = piano di scorrimento, `page-setup.mjs` = preparazione della pagina |
| `remotion/` | Montaggio modificabile (Remotion 4). Testi e tempi in `src/timeline.ts`, grafica in `src/SLReel.tsx` |
| `remotion/public/footage/` | Riprese della landing usate nel montaggio (A: apertura e pacchetti, B: orari flessibili) |
| `assets/audio/` | `voce.mp3` (voce), `musica.mp3` (base strumentale), `voce.parole.json` (tempi delle parole) |
| `assets/logo/logo-sl.webp` | Logo SL originale usato (in `remotion/public/logo-sl.png` la stessa immagine, convertita senza perdita) |
| `build.sh` | Render + mix audio + esportazione del file finale |
| `verifica.sh` | Controlli automatici: formato, loudness, OCR anti-prezzi/"HOLDING", movimento |

## Rigenerare
```bash
cd remotion && npm install && cd ..
node capture/capture.mjs A B     # solo se serve rifare le riprese (da capture/)
./build.sh                        # esporta SL_Landing_Rustico_Reel.mp4
./verifica.sh
```
Per modificare un testo o un tempo: `remotion/src/timeline.ts`, poi `./build.sh`. Anteprima interattiva: `cd remotion && npm run studio`.

## Come è stato girato
- La pagina è quella online (`ilrusticoserviziaggiuntivi.netlify.app`), comprese la sezione "Orari flessibili" e le animazioni originali. **Il sito online non è stato modificato.**
- Prezzi nascosti solo nel browser di ripresa con una regola CSS (`.riquadro__prezzo`, `.fascia__prezzo`, `.rf-price` → `display:none`): nessuna sfocatura né rettangoli, la pagina si ricompone da sola. L'OCR su un fotogramma ogni 0,25 s non trova importi, "€" né "HOLDING".
- Il badge "Powered by Netlify" (aggiunta dell'hosting, non parte della pagina) è stato bloccato in ripresa.
- I petali sono quelli del sito (canvas animato dal suo JavaScript): il tempo dell'animazione viene fatto avanzare frame per frame, così il movimento è fluido e reale, non simulato su una foto.
- Nella ripresa B viene toccata l'opzione "Check-in anticipato + check-out posticipato" (cambia solo lo stato della pagina nel browser). Il pulsante "Richiedi il servizio" **non** viene mai premuto: nessun ordine, pagamento o messaggio.

## Limiti effettivi
- **Logo:** nella sessione non è arrivato nessun allegato. Ho usato il monogramma SL senza scritte pubblicato su slinnova.it (`https://slinnova.it/assets/logo-sl-a.webp`), identico al file originale (solo scala uniforme, nessuna deformazione). Se il logo che intendevi è un altro, sostituisci `remotion/public/logo-sl.png` (stesso nome) e rilancia `./build.sh`.
- **Voce:** sintetica, generata con ElevenLabs (voce "Alfio – Voce fresca e moderna", modello multilingual v2), non registrata da una persona. Durata naturale, senza accelerazioni.
- **Musica:** generata con ElevenLabs Music (v2.5), strumentale (verificato: nessuna voce rilevata). L'uso commerciale di voce e musica dipende dai termini del piano ElevenLabs dell'account, che da qui non posso verificare.
- L'audio è stato controllato con misure (loudness, livelli voce/musica) e con la trascrizione automatica dell'MP4 finale, non con un ascolto umano.
- I petali vengono disegnati dal sito a risoluzione ridotta sui telefoni (comportamento originale), quindi sono leggermente morbidi.
- Remotion è gratuito per privati e aziende fino a 3 persone; oltre serve la licenza aziendale.
- Il file non è stato caricato su Instagram/TikTok: le zone sicure sono rispettate per margini standard (testi tra y 640–1440, margini laterali ≥ 110 px).
