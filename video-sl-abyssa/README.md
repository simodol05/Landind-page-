# SL INNOVA — Video "ABYSSA" (sito per un acquario immersivo)

**File finale:** `SL_INNOVA_Abyssa_26s_4x5.mp4` — 1080×1350 (4:5), 30 fps, 26 s esatti (780 fotogrammi),
H.264 High yuv420p BT.709, AAC stereo 48 kHz, faststart. Per feed Instagram e TikTok.

Nuovo episodio della serie SL (stessa scrivania, stessa camera, stessi titoli del video
"servizi extra" sul ramo `claude/sl-video-extra-rustico`), dedicato al sito
**ABYSSA** — https://taupe-lollipop-e2a921.netlify.app/

## Il progetto mostrato (analisi del sito)
ABYSSA è un concept di sito per un acquario immersivo a Napoli (Molo San Vincenzo), dichiarato nel sito stesso
come progetto portfolio: non vende biglietti veri e non raccoglie pagamenti. Contenuti reali usati nel video:
- hero "Dive beneath the ordinary." con medusa 3D in tempo reale (WebGL);
- "Some worlds have to be felt." con i numeri del percorso (06 ambienti, 42 m, un unico percorso);
- "Six worlds. Endless wonder.": sei mondi marini, ognuno con la sua scheda (nel video: *Bioluminescent Abyss*);
- "A journey with depth.": modello 3D interattivo dell'esposizione, la prospettiva segue il puntatore;
- "A visit. A lasting feeling.": esperienze filtrabili per pubblico (nel video si preme il filtro reale *With family*);
- "Plan your descent.": pianificatore della visita (data, orario, biglietti, totale stimato; demo dichiarata).

## Storyboard (testi e tempi in `remotion/src/timeline.json`)
| Tempo | Testo | Schermo / primo piano |
|---|---|---|
| 0–3 s | Un sito per un acquario / immersivo. — *Un progetto firmato SL INNOVA* | La camera arretra e scopre la scrivania; hero con la medusa 3D |
| 3–7 s | Far sentire il mare / prima ancora della visita. | Avvicinamento al monitor; scorrimento a "Some worlds have to be felt." |
| 7–12 s | Un sito immersivo / tra sei mondi marini. | Griglia dei sei mondi; la scheda reale *Bioluminescent Abyss* esce dallo schermo |
| 12–17 s | ✓ Modello 3D interattivo · ✓ Esperienze per ogni pubblico · ✓ Pianificatore della visita (in sequenza) | Modello 3D che ruota col puntatore → filtro *With family* → il pianificatore "Plan your descent." esce dallo schermo |
| 17–21,3 s | Emozione e praticità, / in un unico sito. | Ritorno alla hero, vista ampia del monitor |
| 21,5–26 s | Logo SL · **SL INNOVA** · Progetti digitali costruiti intorno al tuo business. · **Hai un progetto? Parliamone.** | La camera si alza e si allarga; il sito resta acceso sullo sfondo |

Leggibilità: ogni frase resta ferma almeno 2 s; una frase nuova entra solo dopo che la precedente è uscita
(uscita 0,4 s, pausa 0,2 s). L'invito finale resta a schermo fino all'ultimo fotogramma.

## Struttura
| Cartella / file | Contenuto |
|---|---|
| `capture/sito-locale/` | Copia locale del sito (HTML, CSS, JS, immagini, three.js) scaricata da Netlify. Il sito pubblico non è stato modificato |
| `capture/page-setup.mjs` | Apertura della pagina, WebGL software, tempo delle animazioni (requestAnimationFrame e CSS) controllato fotogramma per fotogramma |
| `capture/screen.mjs` | Ripresa dello schermo del monitor (viewport 1280×637, 2x, 26 s) con scorrimento, puntatore sul modello 3D e clic sul filtro |
| `capture/cards.mjs` | Pannelli in primo piano: le due finestre reali del sito fotografate a 2x |
| `remotion/` | Montaggio (Remotion 4): `src/SLAbyssa.tsx` grafica e animazioni, `src/timeline.json` testi e tempi |
| `remotion/public/ambiente.png`, `logo-sl.png` | Ambiente e logo della serie SL, gli stessi del video di riferimento (logo non ridisegnato) |
| `assets/audio/traccia-riferimento.m4a` | Traccia audio della serie, la stessa del video di riferimento |
| `build.sh` | `./build.sh [prova]`: render finale + audio, oppure anteprima a metà risoluzione |
| `verifica.sh` | Formato, durata, loudness e provino con un fotogramma ogni 0,5 s |

## Rigenerare
```bash
cd remotion && npm install && cd ..
cd capture && python3 -m http.server 8766 --directory sito-locale &   # copia locale
node screen.mjs && node cards.mjs && cd ..                           # solo se cambiano scorrimento o pannelli
./build.sh prova   # controllo veloce
./build.sh         # file finale
./verifica.sh
```
Per cambiare un testo o un tempo: `remotion/src/timeline.json`. Se cambi `scroll` o `events`, rifai `node screen.mjs`.

## Note
- **Niente di inventato:** tutto ciò che compare nel monitor e nei pannelli è il sito reale; i testi del video
  descrivono solo funzioni presenti (mondi, modello 3D, filtri, pianificatore). Nessun risultato commerciale o
  cliente viene dichiarato: ABYSSA è un concept.
- **Prezzi:** sono quelli di esempio del sito ("Sample prices", "No payment or reservation will be made"), visibili
  solo nel pannello del pianificatore così come appaiono nella pagina.
- **Marchio:** solo "SL INNOVA" e il monogramma SL già usato nella serie. Nessuna dicitura "SL HOLDING".
- **Font titoli:** Catamaran (licenza OFL), come nel video di riferimento.
- **Audio:** stessa traccia del video di riferimento; se è musica presa dalla libreria di Instagram/TikTok,
  i diritti fuori dalla piattaforma vanno verificati, oppure si aggiunge la musica nell'app al momento della pubblicazione.
- Remotion è gratuito per privati e aziende fino a 3 persone; oltre serve la licenza aziendale.
