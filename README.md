# Il Rustico — Romantic Suite & Sauna
### Landing page dei servizi extra

Catalogo digitale da inviare agli ospiti nella chat Airbnb dopo la prenotazione.
La pagina **non contiene pagamenti, checkout o prenotazioni**: mostra le proposte
e invita l'ospite a tornare nella chat Airbnb per comunicare quale desidera.

---

## Come pubblicarla online (gratis)

### Opzione A — Netlify, un tocco solo (funziona anche da iPhone e iPad)

[![Pubblica su Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/simodol05/Landind-page-)

Tocca il bottone qui sopra: Netlify apre la procedura con il repository gia'
selezionato. Devi solo accedere con GitHub, autorizzare l'accesso e premere
**Deploy**. Dopo circa 30 secondi ottieni un link tipo
`https://nome-a-caso.netlify.app`: quello e' il link da incollare in Airbnb.

Il link diretto, se il bottone non fosse toccabile:
`https://app.netlify.com/start/deploy?repository=https://github.com/simodol05/Landind-page-`

Per un indirizzo piu' bello: **Site configuration → Change site name**, per
esempio `il-rustico-servizi`.

Da questo momento ogni modifica al repository viene ripubblicata da sola e il
link resta lo stesso.

> Esiste anche **app.netlify.com/drop**, dove si trascina la cartella: comodo da
> computer, ma da iPad non si puo' trascinare, quindi usa il bottone qui sopra.

### Opzione B — GitHub Pages (automatica a ogni modifica)

1. Nel repository apri **Settings → Pages**.
2. Alla voce *Source* scegli **GitHub Actions**.
3. Fatto: a ogni push il sito si ripubblica da solo
   (vedi `.github/workflows/pubblica.yml`).

Il link sara' `https://<tuo-utente>.github.io/<nome-repository>/`.

> Il repository non aveva ancora nessun ramo: il ramo di lavoro
> `claude/il-rustico-landing-page-ngmudy` e' diventato il ramo predefinito.
> Se piu' avanti lo rinomini in `main`, la pubblicazione automatica continua a
> funzionare: il workflow ascolta entrambi i nomi.

### Opzione C — qualsiasi altro hosting statico

Carica il contenuto della cartella cosi' com'e'. Non serve nessun build,
nessun database, nessun server: sono solo file statici.

L'ospite apre il link **senza creare account**, da iPhone, iPad, Android o computer.

---

## L'unica cosa da personalizzare: il link Airbnb

Apri `assets/js/main.js` e modifica la prima riga utile:

```js
const AIRBNB_URL = "";
```

- **Lasciandola vuota**: il bottone finale resta una targhetta non cliccabile e
  sotto compare la spiegazione "Apri l'app o il sito Airbnb e scrivimi nella chat
  della tua prenotazione". La pagina funziona perfettamente cosi'.
- **Inserendo un link** (per esempio la conversazione Airbnb):

  ```js
  const AIRBNB_URL = "https://www.airbnb.it/messaging/thread/123456789";
  ```

  il bottone "Scrivimi su Airbnb" diventa un vero collegamento che si apre in una
  nuova scheda.

---

## Contenuti della pagina

| Sezione | Contenuto |
|---|---|
| Hero | Marchio, titolo, sottotitolo, bottone verso le esperienze |
| Introduzione | "Un'esperienza pensata per voi" |
| Esperienze d'Amore | Essenza d'Amore **€39** · Momento d'Amore **€79** · Sogno d'Amore **€109** |
| Il Dolce Risveglio | Colazione per 2, **inclusa** nel pacchetto Sogno d'Amore |
| Buongiorno dal Rustico | **€24,90** — proposta separata e indipendente |
| Call to action | Invito a scrivere in chat Airbnb indicando il servizio scelto |
| Footer | Marchio e claim |

---

## Struttura dei file

```
index.html                    la pagina
assets/css/style.css          grafica e impaginazione
assets/css/fonts.css          dichiarazioni dei caratteri
assets/fonts/                 caratteri ospitati localmente (nessuna chiamata a Google)
assets/js/main.js             link Airbnb + animazioni leggere
assets/img/                   fotografie ottimizzate (WebP + JPEG)
foto-originali/               le fotografie originali, non toccare
tools/build-images.py         rigenera le immagini ottimizzate
```

## Come cambiare o aggiungere una fotografia

1. Metti la nuova foto in `foto-originali/`.
2. Apri `tools/build-images.py` e aggiungi una voce nel dizionario `ASSETS`
   indicando file di partenza, ritaglio e larghezze desiderate.
3. Lancia:

   ```bash
   python3 tools/build-images.py
   ```

4. Richiama il nuovo nome dentro `index.html`.

Lo script produce automaticamente le versioni WebP e JPEG a piu' risoluzioni,
cosi' ogni dispositivo scarica solo quella che gli serve.

## Note tecniche

- Nessuna dipendenza esterna: la pagina funziona anche offline una volta caricata.
- Caratteri ospitati localmente: nessun dato dell'ospite viene inviato a terze parti.
- Immagini in WebP con fallback JPEG, caricamento differito, dimensioni dichiarate.
- Contrasto dei testi verificato secondo WCAG 2.1 livello AA.
- Rispetta l'impostazione di sistema "riduci le animazioni".
