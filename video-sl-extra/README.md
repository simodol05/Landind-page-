# SL — Video "Servizi extra in un'unica pagina" (progetto: Il Rustico)

**File finali** (30 fps, 26 s, H.264 High yuv420p BT.709, AAC stereo 48 kHz, −13 LUFS, faststart):
| File | Formato | Dove |
|---|---|---|
| `SL_Extra_Rustico_26s_4x5.mp4` | 1080×1350 (4:5) | feed Instagram, LinkedIn |
| `SL_Extra_Rustico_26s_9x16.mp4` | 1080×1920 (9:16) | TikTok, Reel Instagram |

Nella versione 9:16 l'inquadratura è quella intera del riferimento. Titoli, didascalie e invito finale restano nelle zone sicure delle app: niente testi nei primi ~250 px, negli ultimi ~460 px (didascalia, audio, nome utente) e nella colonna delle icone a destra.

Il video presenta ai proprietari di B&B il lavoro di SL: una landing dedicata ai servizi aggiuntivi.
Il Rustico Romantic Suite & Sauna è il progetto reale mostrato come esempio.

## Storyboard (testi in `remotion/src/timeline.json`)
| Tempo | Titolo | Schermo / primo piano |
|---|---|---|
| 0–5 s | Hai un B&B? / Dai più valore a ogni soggiorno. | Ingresso con leggero arretramento della camera; landing reale nel monitor |
| 5–10 s | I tuoi servizi extra. / In un’unica pagina. | Scorrimento ai pacchetti; la scheda reale "Momento d’Amore" esce dallo schermo |
| 10–17 s | Un soggiorno, / più possibilità. | Tre schede, una protagonista alla volta: Colazioni per due → Sorprese romantiche → Orari flessibili |
| 17–21 s | Fai scoprire agli ospiti / tutto ciò che puoi offrire. | Le schede rientrano; vista ordinata dei servizi |
| 21–26 s | Una landing su misura / per la tua struttura. | Logo SL argentato su nero; "Scrivici ‘EXTRA’ in DM"; firma del progetto |

## Struttura
| Cartella / file | Contenuto |
|---|---|
| `capture/sito-locale/` | Copia locale della landing (`ilrusticoserviziaggiuntivi.netlify.app`). Il sito pubblico non è stato modificato |
| `capture/page-setup.mjs` | Preparazione della pagina: prezzi nascosti con `display:none`, tempo delle animazioni controllato |
| `capture/screen.mjs` | Ripresa dello schermo del monitor fotogramma per fotogramma (viewport 1280×637, 2x) |
| `capture/cards.mjs` | Schede in primo piano: componenti reali della pagina fotografati a 3x |
| `tools/ambiente.py` | Ambiente pulito ricavato dal video KnowledgeDesk originale (nessuna immagine generata) |
| `remotion/` | Montaggio modificabile (Remotion 4): `src/SLExtra.tsx` grafica, animazioni e i due formati (composizioni `SLExtra` 4:5 e `SLExtra916` 9:16), `src/timeline.json` testi e tempi |
| `assets/audio/traccia-riferimento.m4a` | Traccia audio del video di riferimento allegato (usata nel file finale) |
| `assets/audio/effetti-knowledgedesk.m4a` | Effetti sonori del video KnowledgeDesk 29 s (alternativa, non usata) |
| `assets/logo-sl-originale.webp` | Logo SL già usato nel reel SL (monogramma senza scritte) |
| `build.sh` | `./build.sh [4x5\|9x16] [prova]`: render finale + audio, oppure anteprima a metà risoluzione |
| `verifica.sh` | Formato, loudness, OCR su un fotogramma ogni 0,25 s (prezzi, HOLDING, KnowledgeDesk) |

## Rigenerare
```bash
cd remotion && npm install && cd ..
cd capture && python3 -m http.server 8765 --directory sito-locale &   # copia locale
node screen.mjs && node cards.mjs && cd ..                           # solo se cambiano scorrimento o schede
./build.sh 4x5 prova  # controllo veloce
./build.sh 4x5        # feed Instagram / LinkedIn
./build.sh 9x16       # TikTok / Reel
./verifica.sh SL_Extra_Rustico_26s_9x16.mp4
```
Per cambiare un testo o un tempo: `remotion/src/timeline.json`. Se cambi `scroll`, rifai `node screen.mjs`.
Anteprima interattiva: `cd remotion && npm run studio`.

## Note
- **Prezzi:** nascosti solo nel browser di ripresa (`.riquadro__prezzo`, `.fascia__prezzo`, `.rf-price`). La pagina si ricompone da sola: nessuna sfocatura, nessun numero inventato. `cards.mjs` si ferma se in una scheda compare un importo. Il testo visibile della pagina di ripresa non contiene "€" né importi.
- **Orari flessibili:** nella scheda resta la nota originale "Servizio soggetto a disponibilità e conferma della struttura". Il pulsante non viene mai premuto.
- **Schede compatte:** per tenerle leggibili su telefono sono state nascoste alcune voci (solo nel browser di ripresa). Non ci sono testi aggiunti.
- **Ambiente:** è il fotogramma a 24,6 s del video KnowledgeDesk, con lo schermo nero e senza piè di pagina. Le due scritte residue sono state coperte con la texture vicina. Il riferimento è in 9:16: la versione 4:5 lo inquadra da y=230, la 9:16 lo usa intero. Il piè di pagina "SL / Digital experiences" non c'è in nessuna delle due: in 4:5 non entra, in 9:16 cadrebbe sotto la didascalia delle app.
- **Font titoli:** Catamaran (Google Fonts, licenza OFL), il più vicino disponibile al carattere del riferimento.
- **Audio:** la traccia proviene dalla registrazione allegata (`.mov`). Se è musica presa dalla libreria di Instagram/LinkedIn, i diritti fuori dalla piattaforma vanno verificati. In alternativa si può aggiungere la musica direttamente nell'app al momento della pubblicazione.
- Remotion è gratuito per privati e aziende fino a 3 persone; oltre serve la licenza aziendale.
