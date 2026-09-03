# Centro operativo — Luxury Business

Pagina del centro operativo pubblicata su
`https://centro-operativo-rustico.netlify.app/`.

Questo file è **solo la facciata** (l'unico file statico del sito). Il servizio
che risponde su `/api/...` — login, stato condiviso, calendari dei portali — non
è in questo repository e **non va toccato**: per aggiornare il sito basta
sostituire `index.html`, lasciando le funzioni Netlify dove sono.

## Cosa è cambiato

### 1. Nome dell'ospite nella dashboard

I tre riquadri in home mostravano solo delle date. Ora mostrano il nome:

| Riquadro | Valore | Riga sotto |
|---|---|---|
| Prenotazione attuale | nome dell'ospite presente | date del soggiorno e portale |
| Prossimo ospite | nome del prossimo arrivo | data di check-in e portale |
| Prossimo check-out | nome di chi esce | data di check-out |

Se il portale non ha mandato il nome compare *«Nome ospite da inserire»* (si
inserisce da **Collegamenti**), così la casella non resta muta.

Corretti anche due difetti: le prenotazioni venivano cercate nell'ordine di
arrivo dai portali, che non è garantito — ora vengono ordinate prima di cercare
«il prossimo» — e i periodi bloccati non vengono più scambiati per un ospite.

### 2. Guadagno del mese fermo a 0

Il collegamento era corretto: sbagliata era la lettura.

Il servizio somma i movimenti **riga per riga**, ma il software contabilità non
tiene una riga per movimento: tiene **una sola riga per utente** (tabella
`app_data`) con dentro, nella colonna `data`, tutto il JSON — prenotazioni,
pacchetti, spese. Sommando le righe non si incontra nessun importo, quindi il
totale usciva `0` anche a collegamento riuscito.

C'è un secondo motivo, verificato: quella riga è protetta. Senza login il
database risponde con una lista **vuota** e nessun errore — di nuovo `0`, e
senza niente che lo segnali.

Ora la pagina legge la stessa riga che legge il software contabilità, con lo
stesso login, e somma come fa lui: `revenue` delle prenotazioni che iniziano nel
mese in corso, più i pacchetti la cui data cade nel mese. Ogni voce entra nel
totale in base alla **sua** data, quindi un pacchetto di agosto non finisce mai
nel totale di settembre. Il valore del servizio resta come ripiego.

Il totale si aggiorna **in tempo reale**: oltre alla rilettura periodica, la
pagina si mette in ascolto su Supabase Realtime, lo stesso canale che usa il
software contabilità, e ricalcola nell'istante in cui una prenotazione viene
aggiunta o corretta. Il mese di riferimento si ricalcola a ogni lettura, così
con la pagina aperta a cavallo di mezzanotte il primo del mese il totale cambia
da solo.

Sotto il grafico, **Vedi le voci contate** elenca riga per riga data, nome e
importo di tutto ciò che è entrato nel totale: se un importo non torna si vede
subito quale voce lo causa e a che data è registrata.

> **Servono anche e-mail e password del software contabilità**, in
> *Collegamenti → Software contabilità*: senza login il database non mostra
> nulla. La password serve solo per accedere e non viene salvata: resta la sola
> sessione, gestita dalla libreria Supabase. Il collegamento è in sola lettura,
> la contabilità non viene mai modificata.

### 3. Inventario

- Nuovo pulsante **Salva quantità** per acqua e vino. Si accende solo quando
  c'è qualcosa da salvare.
- Le quantità ora si conservano davvero. Prima non venivano salvate da nessuna
  parte e ogni ridisegno dell'inventario le riportava ai valori di serie
  (12 e 6).
- Tolta la **×** in fondo a ogni voce: l'elenco a riposo è pulito.
- L'eliminazione resta disponibile dietro **Modifica elenco**: si preme una
  volta, compaiono i cestini, si toglie quel che serve e si chiude con *Fine
  modifica*. Così non si cancella niente per sbaglio sfiorando lo schermo.
- Lo scarico dalla sezione *Pulizie* passa dallo stesso stato e si salva da solo.

### 4. Codici cassetta

Prima il codice viveva solo nella pagina: bastava cambiare sezione o ricaricare
per perderlo. Ora codice attuale, prossimo codice e storico vengono salvati a
ogni modifica, anche mentre si digita.

Lo storico continua a mostrare solo la data e `••••`, mai il codice.

### 5. Attività aggiunte a mano nel promemoria

Accanto al contatore di *Priorità di oggi* c'è un **+**: apre un campo per
scrivere una voce tua, che compare nell'elenco con la sua casella da spuntare e
una × per eliminarla.

Le voci restano finché non le elimini; le **spunte si azzerano ogni giorno**,
perché quel riquadro è la lista di oggi e non un archivio. Anche le spunte sulle
attività di serie ora si conservano durante la giornata.

## Dove vengono salvati i dati

Quantità e codici vengono inviati al servizio (`POST /api/prefs`), così si
ritrovano su ogni dispositivo, **e** copiati sul dispositivo come rete di
sicurezza. Se il servizio non accetta i nuovi campi la copia locale regge
comunque il salvataggio, e la pagina lo dice invece di fingere che sia andata.

Per la sincronizzazione fra dispositivi il servizio deve conservare in `prefs`
anche le chiavi `quantities`, `keyCodes` e `tasks`.
