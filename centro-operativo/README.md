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
mese in corso. **I pacchetti restano fuori dal totale**, esattamente come nel
software contabilità, dove stanno in una scheda a parte e non entrano
nell'incasso mensile: il numero in home deve corrispondere a quello che leggi
là. I pacchetti del mese vengono comunque mostrati, sotto e separati. Il valore
del servizio resta come ripiego.

### Incasso o netto: lo scegli tu

Nella tabella del software contabilità ogni prenotazione mostra **due** importi
diversi: `incasso` (quanto arriva) e `netto` (incasso meno pulizie ed extra, ed
è la colonna in grassetto). Sommando a occhio si può prendere l'una o l'altra, e
«guadagno» può legittimamente voler dire entrambe.

Invece di sceglierne una, il riquadro ha un interruttore **Incasso / Netto**:
il totale grande segue la scelta, accanto compare sempre l'altro valore, e anche
il dettaglio riga per riga cambia colonna. La scelta resta salvata.

### Perché una somma fatta a mano può non tornare

Il software contabilità salta le prenotazioni **senza data di inizio**
(`if (!b.startDate) return;`): non appartengono a nessun mese e non entrano in
nessun totale mensile. Sommandole a mano invece si contano, ed è lì che nasce
quasi sempre la differenza fra il totale scritto a mano e quello automatico.

Invece di farle sparire in silenzio, la pagina le conta e le elenca in giallo
sotto il totale, con l'importo che rappresentano: basta aprire la prenotazione
nel software contabilità e metterle la data perché rientri nel mese giusto.

Il totale si aggiorna **in tempo reale**: oltre alla rilettura periodica, la
pagina si mette in ascolto su Supabase Realtime, lo stesso canale che usa il
software contabilità, e ricalcola nell'istante in cui una prenotazione viene
aggiunta o corretta. Il mese di riferimento si ricalcola a ogni lettura, così
con la pagina aperta a cavallo di mezzanotte il primo del mese il totale cambia
da solo.

Sotto il grafico, **Vedi le voci contate** elenca tutto in tre gruppi:

| Gruppo | Nel totale | Perché |
|---|---|---|
| Nel totale | sì | prenotazioni con data nel mese in corso |
| Prenotazioni senza data | no | il software contabilità non le assegna a nessun mese |
| Pacchetti | no | contati a parte, come nel software contabilità |

Ogni riga porta data, nome, piattaforma, stato e importo: se un totale non torna
si vede subito quale voce lo causa.

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
anche le chiavi `quantities`, `keyCodes`, `tasks` e `earningsMode`.

## Aggiornamento: workflow che resta e guadagno visibile dal telefono

### Il totale del mese non compariva sul telefono

Il pc legge la contabilità in diretta e ne salva una **fotografia** nello stato
condiviso, così gli altri dispositivi vedono il numero senza rifare il login.
La fotografia però non veniva mai usata: il servizio risponde sempre con un
oggetto e, quando la contabilità non è collegata lì, manda
`{ configured: false }`. In JavaScript quell'oggetto è "vero", quindi passava
prima della fotografia e il riquadro restava a zero — sul pc no, perché lì c'è
la lettura diretta che viene ancora prima.

Ora il valore del servizio conta solo se dichiara di essere davvero collegato.
L'ordine è: lettura diretta di questo dispositivo → servizio collegato →
fotografia arrivata dagli altri dispositivi.

### La contabilità sul telefono

Indirizzo, tabella, chiave anon ed e-mail viaggiano già con lo stato condiviso:
sul telefono la scheda *Collegamenti → Software contabilità* si compila da sola
e adesso lo dice esplicitamente — «chiave anon già collegata, manca solo la
password». Inserita quella una volta, anche il telefono legge in diretta.

La password non viene sincronizzata di proposito: è la credenziale del software
contabilità e resta sul dispositivo dove la scrivi, sotto forma di sessione
gestita da Supabase.

### Le spunte del workflow sparivano

La pagina richiede lo stato al servizio ogni 8 secondi. Se una risposta partita
*prima* di un salvataggio arrivava *dopo*, riportava indietro la copia vecchia e
la spunta appena messa spariva. Sul telefono succedeva più spesso, perché la
rete è più lenta e la finestra più larga.

Due correzioni:

- lo stato condiviso porta un numero di versione; finché il servizio non ci
  restituisce almeno la nostra, una risposta più vecchia non sovrascrive nulla,
  e durante un salvataggio in corso le risposte vengono ignorate;
- la fusione con i dati remoti è prudente: una voce **vuota** nella copia remota
  non cancella più quella presente qui. Prima un dispositivo che non aveva mai
  collegato niente, salvando, spediva dei `null` che spegnevano il collegamento
  contabilità anche agli altri.

### Pulsante «Salva su tutti i dispositivi»

In fondo al *Workflow ospite*. Ogni spunta si salva già da sola, ma senza una
conferma sotto gli occhi sembrava non fosse successo niente: il pulsante rimanda
lo stato e scrive com'è finita — «Workflow salvato su tutti i dispositivi»,
oppure che è rimasto solo qui se il servizio non risponde.

## Aggiornamento: il numero in home non viene più dal servizio

### Il sintomo

Sul telefono la dashboard mostrava **15,99 €** — cioè il solo pacchetto appena
aggiunto — invece del totale del mese. Toccando il pulsante *Incasso* il numero
diventava corretto, ma chiudendo e riaprendo tornava sbagliato.

### La causa

Quel comportamento è la firma esatta del difetto. Il pulsante *Incasso*
ridisegna il riquadro **senza** passare il valore del servizio, quindi cadeva
sulla fotografia corretta; l'apertura invece ridisegna **con** il valore del
servizio, che vinceva e copriva la fotografia.

Il valore del servizio è quello del lettore difettoso diagnosticato all'inizio:
somma riga per riga, mentre la contabilità tiene tutto dentro **un unico blob
JSON in una riga sola**. Con questa forma dei dati non può produrre un totale
giusto. Prima restituiva `0`; ora che c'è un pacchetto restituisce quello.

Riprodotto in laboratorio contro un finto servizio che dichiara 15,99: la
versione precedente mostrava `15,99 €`, quella corretta mostra `639,14 €`.

### La correzione

In home compaiono **solo cifre calcolate con la regola giusta**: la lettura
diretta di questo dispositivo, oppure la fotografia calcolata con la stessa
regola su un altro dispositivo. Il numero del servizio non viene più mostrato.

Se non c'è né l'una né l'altra non si inventa un numero: compare una lineetta
`—` e la nota dice cosa fare. Scrivere `0,00 €` sarebbe stata un'affermazione
falsa sugli incassi del mese, non un posto vuoto.

### Aggiornamento in tempo reale sul telefono

Il pc è in ascolto sulle modifiche della contabilità, ma finora una modifica
aggiornava solo il suo schermo: la fotografia condivisa veniva riscritta solo
al giro di rilettura da un minuto. Ora ogni lettura nuova ripubblica la
fotografia (accorpando le modifiche ravvicinate in un salvataggio solo), e il
telefono la riceve al suo giro da 8 secondi. Misurato: **5–8 secondi** dalla
modifica sul pc alla comparsa sul telefono.

In più il payload di Realtime viene controllato prima di essere creduto:
Postgres tronca i messaggi troppo grossi e la scheda della contabilità è un
blob che cresce a ogni prenotazione. Se non arriva una scheda intera la riga
viene riletta per intero invece di pubblicare a tutti i dispositivi un totale
calcolato su dati mozzati.

### I pacchetti

Restano fuori dal totale, come nel software contabilità, ma non devono sembrare
spariti: sotto il numero ora si legge quanto valgono e quanto fa la somma
complessiva — «1 pacchetto a parte 15,99 € · con i pacchetti 655,13 €».

## Aggiornamento: ordine del workflow, salvataggio automatico, prompt apribili

### Il Rustico · nuovo ordine dei passaggi

Dopo *Richiesta documenti* la sequenza è cambiata:

| | prima | adesso |
|---|---|---|
| 03 | Check-in effettuato | **Check-in con guida** |
| 04 | Alloggiati Web e ROSS1000 | **Istruzioni di check-in** |
| 05 | Istruzioni di check-in | **Registrazione Portale Alloggiati e ROSS 1000** |

Gli altri sei passaggi restano dov'erano. Insieme all'ordine sono stati
allineati i due punti che lo rispecchiavano altrove, altrimenti l'app avrebbe
detto due cose diverse: il *Promemoria della prenotazione* e il richiamo che
ridisegna le attività di oggi quando si spunta l'adempimento sui portali.

### I campi scritti a mano non si perdono più

Nei profili freelance il testo finiva nello stato **solo premendo Salva**:
bastava toccare *Torna ai profili* o chiudere l'app per perderlo.

Ora ogni tasto premuto scrive subito nello stato, e il salvataggio parte da
solo dopo mezzo secondo di pausa — così non si manda una richiesta a ogni
lettera. Quello che è ancora in attesa viene mandato subito quando esci dal
campo, quando torni ai profili e quando l'app passa in secondo piano o viene
chiusa (con `keepalive`, altrimenti alla chiusura la richiesta verrebbe
annullata a metà). Il pulsante *Salva* resta, per chi vuole la conferma.

C'è anche una protezione che prima mancava: mentre stai scrivendo, una risposta
del servizio non può più riportare indietro il testo sotto le dita.

### Prompt: elenco puntato che si apre

La sezione *Prompt* era un elenco di sole righe di testo. Adesso ogni prompt ha
un **titolo** e il **prompt vero e proprio**: l'elenco mostra i titoli, e
toccandone uno si apre il testo, modificabile, con un pulsante per copiarlo.

I prompt già salvati col formato vecchio non si perdono: il testo che c'era
diventa il titolo, e il corpo resta da riempire.

Vale per tutti e due i profili di Workana e anche per Upwork: la sezione è la
stessa per tutti i profili freelance.

## Aggiornamento: pacchetti nel totale, somma Gian + Lorenzo, workflow che riparte

### I pacchetti entrano nel guadagno del mese

Il numero in home era la somma delle sole prenotazioni, con i pacchetti contati
a parte — la stessa regola del software contabilità. Ora i pacchetti sono
**dentro il totale**.

La somma si fa al momento di mostrare il numero, non dentro il calcolo: così
vale anche per le fotografie salvate prima di questa modifica, che tengono i
pacchetti in una voce separata e altrimenti andrebbero ricalcolate.

> Da adesso il numero in home **non coincide più** con il totale mensile del
> software contabilità, che i pacchetti li tiene fuori. È una differenza voluta,
> e la nota sotto il numero lo scrive, altrimenti sembrerebbe un errore di conto.

Vale in tutte e due le colonne: *incasso* e *netto*. Il dettaglio «vedi le voci
contate» mostra prenotazioni e pacchetti in due gruppi e chiude con il totale.

### Calcolatore: riga «Gian + Lorenzo»

Sotto le tre quote c'è una quarta riga con la somma di Gian e Lorenzo, che si
aggiorna insieme al resto ogni volta che cambia un importo. È staccata
graficamente dalle altre: è una somma di due quote già mostrate sopra, non un
quarto proprietario.

Verificato: 1.000 € ricevuti, 200 € di pulizie, 50 € di pacchetti →
Gian 600,00 · Simona 225,00 · Lorenzo 225,00 · **Gian + Lorenzo 825,00**.

### Il workflow riparte dopo ogni check-out

Prima il workflow passava al prossimo ospite **la mattina stessa** del
check-out: `present` richiede che l'uscita sia oltre oggi, quindi nel giorno
dell'uscita l'ospite non era più "presente". Conseguenza: gli ultimi tre
passaggi — pulizia completata, recensione dell'ospite, messaggio finale, che si
spuntano proprio quel giorno — non si potevano più segnare.

Adesso:

- **il giorno del check-out** il workflow resta sull'ospite che parte, e la
  testata lo dice: «Esce oggi · ultimi passaggi, poi il workflow riparte pulito»;
- **dal giorno dopo** riparte da zero sul prossimo ospite.

L'azzeramento non dipende più solo dal cambio di prenotazione: il workflow si
porta dietro la data di uscita, così riparte pulito anche se in calendario non è
ancora comparsa la prenotazione successiva.

## Aggiornamento: una sola lista di prenotazioni, guadagni fedeli alla contabilità

### Le cose da fare non spariscono più quando aggiungi una prenotazione

C'erano **due liste di prenotazioni che si ignoravano**: quelle dei calendari e
quelle scritte a mano. Inserendone una a mano, il codice riscriveva i riquadri e
ricostruiva le attività di oggi **sulla sola prenotazione appena inserita** —
ed è lì che sparivano pulizie programmate e adempimenti già in calendario. Al
giro di lettura successivo (8 secondi) succedeva l'opposto: spariva l'effetto di
quella aggiunta a mano.

Ora la lista è una sola: calendari più aggiunte a mano. Tutto quello che ne
deriva — attività di oggi, pulizie programmate, workflow, riquadri in alto — si
ricalcola una volta sola su quella somma.

Effetti collaterali, tutti in meglio:

- le prenotazioni scritte a mano **si salvano** e si ritrovano dopo un ricarico
  (prima vivevano solo nella pagina e sparivano);
- si vedono **anche dagli altri dispositivi**;
- compaiono nelle **pulizie programmate**, che prima ignoravano le manuali;
- inserire due volte lo stesso soggiorno lo **sostituisce** invece di duplicarlo;
- se il portale importa un soggiorno già inserito a mano, vince quello del
  calendario e non si vede due volte.

### Il guadagno del mese ora rispecchia il software contabilità

**Perché «aggiorna» non aggiornava niente.** Il software contabilità tiene una
riga per utente e la rilegge sempre con `.eq('user_id', …)`. Il centro operativo
invece prendeva *la prima riga che capitava* — `select().limit(1)`, senza filtro
né ordinamento. Con più righe in tabella si poteva leggere per sempre quella
sbagliata: premere Aggiorna non cambiava niente perché la riga letta era davvero
sempre la stessa. Ora si chiede la propria riga, esattamente come fa il software
contabilità.

**Cosa entra nel mese.** Sia gli importi **ricevuti** sia quelli **da ricevere**:

| voce | nel totale |
|---|---|
| prenotazioni del mese, stato *Ricevuto* | sì |
| prenotazioni del mese, stato *Da ricevere* | sì |
| righe **senza data** (pagamenti in arrivo) | sì, fra quelle da ricevere |
| pacchetti del mese | sì |
| mesi diversi da quello corrente | no |

Le righe senza data nel software contabilità non appartengono a nessun mese —
lì vengono saltate. Qui entrano nel mese corrente fra quelle da ricevere, e nel
dettaglio hanno un gruppo tutto loro perché si vedano.

**Cosa si legge adesso.** Sotto il numero: quanto è già stato ricevuto e quanto
è ancora atteso, e **quando è stata modificata la scheda** della contabilità —
così se premi Aggiorna e quella data non si muove, il dato di là non è cambiato.

Il dettaglio «vedi le voci contate» elenca ogni riga con il suo stato
(*Ricevuto* / *Da ricevere*), divisa in prenotazioni del mese, righe senza data
e pacchetti, e chiude con il totale: **i gruppi sommati fanno esattamente il
numero in home**, in entrambe le colonne incasso e netto.


## Correzione: nel mese ci sta ciò che ha una data nel mese

La versione precedente metteva nel totale anche le **righe senza data**, e il
numero risultava più alto di quello del software contabilità.

La regola giusta è quella del software contabilità stesso, che per costruire i
suoi mesi salta le righe senza data (`if (!b.startDate) return;`). Quindi nel
totale di settembre entra **solo ciò che ha una data di settembre**:

| voce | nel totale |
|---|---|
| prenotazioni con data in settembre (*Ricevuto* e *Da ricevere*) | sì |
| pacchetti con data in settembre (*Ricevuto* e *Da ricevere*) | sì |
| righe **senza data** | **no** |
| altri mesi | no |

Le righe senza data restano visibili in un gruppo a parte, dichiarato e in
ambra: sono soldi attesi e non devono sparire dalla vista, ma non entrano nel
conto. Appena metti la data nel software contabilità rientrano da sole.

### Un solo calcolo per il numero grande e per il dettaglio

Cambiando la regola è emerso un difetto di transizione: una fotografia salvata
da un dispositivo non ancora aggiornato porta un totale calcolato **alla
vecchia maniera**, e il numero in alto diceva una cosa (771,25) mentre le righe
sotto ne dicevano un'altra (695,99).

Ora i totali — numero in home, riga *Totale del mese*, ripartizione
ricevuti/attesi, conteggi — si ricavano tutti **dalle stesse voci**, in un punto
solo. Discordare è diventato impossibile, anche mentre i dispositivi si
aggiornano.

### Confronto diretto col software contabilità

In fondo al dettaglio c'è una riga in più:

> Nel software contabilità, alla riga del mese: **650,00 €**

È la cifra che trovi là alla riga del mese — solo prenotazioni, senza pacchetti,
perché là i pacchetti non entrano in quella riga. Se i due numeri non
corrispondono lo vedi subito, senza doverli confrontare a mano.

## I miei software: collegare gli altri programmi senza toccare il codice

Prima, collegare un programma nuovo voleva dire modificare il codice. Ora c'è
una sezione in **Collegamenti → I miei software** dove li aggiungi tu.

Per ogni programma:

- **Nome** e **indirizzo** → bastano per avere il pulsante **Apri**, e funzionano
  con qualsiasi software, anche quelli senza dati sul server;
- **collegamento dati** (facoltativo): indirizzo Supabase, chiave anon, tabella
  ed e-mail. Se li compili, il centro operativo legge quella tabella e mostra
  **quante righe** ci sono, le **somme delle colonne numeriche** principali e la
  **data più recente** trovata.

La lettura è generica — conta le righe e somma i numeri — quindi funziona con
qualunque tabella senza sapere com'è fatta.

Tutto si salva nello stato condiviso: i software aggiunti e i loro riepiloghi si
ritrovano **su ogni dispositivo** che apre il link, e il centro operativo resta
online e modificabile come sempre.

La **password** di ciascun programma resta sul dispositivo dove la scrivi, come
per la contabilità: fra i dispositivi viaggia solo il riepilogo già calcolato.

### Cosa si può collegare e cosa no

Ho guardato gli altri software pubblicati:

| software | dati sul server | cosa si può fare |
|---|---|---|
| Software contabilità | Supabase (`app_data`) | già collegato a parte, con la sua sezione |
| SB Beauty — Gestione Aziendale | Supabase (`invoices`, `products`, `members`, `movements`…) | collegamento dati completo |
| Barometro BTC | solo `localStorage` | solo collegamento rapido |
| Le landing page del Rustico | nessuno | solo collegamento rapido |

Dove i dati vivono solo nel browser di quel programma (`localStorage`) non c'è
niente da leggere da fuori: lì il collegamento resta una scorciatoia per aprirlo.

### Un errore che c'era già

La classe `.api-save` è usata anche fuori dalle schede delle chiavi API. Un
vecchio gestore cercava la scheda `.api-card` attorno al pulsante e, non
trovandola, sollevava un errore in pagina a ogni clic. Il salvataggio andava
avanti lo stesso col suo gestore, ma l'errore restava: ora c'è il controllo.

## Righe senza data: la scelta è tua, e la differenza è visibile

Lo scarto segnalato — **1246 invece di ~1500**, circa **254 €** — corrisponde
alle righe che nel software contabilità **non hanno una data**.

Non esiste una risposta oggettiva su dove vadano: per il software contabilità
non appartengono a nessun mese (le salta), ma sono soldi attesi e nella testa di
chi gestisce la struttura fanno parte del mese in corso. Invece di decidere al
posto di chi usa l'app — e di cambiare idea a ogni giro — ora c'è una casella
sotto il riquadro del guadagno:

> ☐ **Conta anche le righe senza data del software contabilità** — 254,00 €

Compare **solo se esistono davvero** righe senza data, e mostra sempre quanto
valgono: la differenza fra i due modi di contare è un numero sotto gli occhi.
La scelta si salva su tutti i dispositivi.

Verificato: casella non spuntata → **1.246,00 €**; spuntata → **1.500,00 €**;
differenza **254,00 €**, esattamente il valore delle righe senza data.

## Diagnostica della lettura

In **Collegamenti → Software contabilità** c'è il pulsante **Diagnostica**.
Mostra la scheda com'è davvero:

- quante righe ci sono nella tabella e **quale è stata letta** (la tua o, se non
  ce n'è una intestata a te, la prima disponibile) e quando è stata modificata;
- una tabella **mese per mese**: quante prenotazioni, quanto valgono, quanti
  pacchetti e quanto valgono, col mese in corso evidenziato;
- quante righe sono **senza data** e quanto valgono;
- il totale di **tutte** le prenotazioni e i pacchetti, senza filtro di mese.

Serve a rispondere in un colpo d'occhio alla domanda che prima richiedeva un
giro di messaggi:

- il numero atteso compare alla riga *«tutte le prenotazioni»* ma non a quella
  del mese → è una questione di **date**;
- non compare da nessuna parte → la lettura sta prendendo una **scheda diversa**
  da quella che guardi.

## Due allarmi che mentivano

### «Sincronizzazione non attiva» era un falso allarme

Il controllo provava una via **diversa** da quella che l'app usa davvero per
salvare: spediva solo la voce `shared` e guardava solo quella. Il servizio non
conserva quella chiave, quindi il verdetto era **sempre** «non attiva» — anche
quando la sincronizzazione funzionava perfettamente attraverso il pacchetto
nascosto dentro `hiddenInventory`, che è la via in uso.

Peggio: quel falso negativo faceva scrivere a **ogni salvataggio** che i dati
restavano solo su quel dispositivo, quando invece stavano arrivando ovunque.

Ora il controllo usa la stessa via del salvataggio vero e verifica entrambe le
strade, dicendo quale delle due regge.

### La contabilità sembrava collegata anche dove non lo era

Il collegamento può essere salvato **sul servizio** mentre su un dispositivo la
lettura diretta non è mai partita. In quel caso la scheda mostrava indirizzo,
tabella e login — sembrava tutto a posto — e la chiave appariva come
«salvata: ••••q7lw», che è la chiave tenuta dal servizio, non una chiave
presente su quel dispositivo.

Risultato: il totale in home arrivava dal **conteggio del servizio**, quello che
con questo formato dati sbaglia. Ed è esattamente il numero che non tornava.

Adesso la scheda lo dice: *«NON collegato su questo dispositivo: incolla chiave
e password e premi Collega»*, la chiave dichiara di stare sul servizio e di
dover essere reincollata, e il conteggio del servizio non viene più presentato
come buono ma accompagnato dall'avvertenza e da cosa fare.

## Collegare la contabilità una volta sola

La chiave anon era già salvata e sincronizzata. A costringere a ricollegare era
la **password**: `signInWithPassword` lascia una sessione Supabase che prima o
poi scade, e da quel momento la lettura diretta si ferma e il totale in home
ricade sul conteggio del servizio, quello che con questo formato dati sbaglia.

Ora nel modulo c'è una casella, già spuntata:

> ☑ **Ricorda la password su questo dispositivo**, così non devo più
> ricollegarla: premendo *Aggiorna* rientra da solo. Resta in questo browser,
> non viene mandata agli altri dispositivi. Non spuntarla su un computer
> condiviso.

Quando la sessione è scaduta e una password è ricordata, la lettura **rientra da
sola** prima di leggere: *Aggiorna* non chiede più nulla.

Tre dettagli che rendono la cosa onesta invece che comoda e basta:

- la password vive **solo in quel browser** (`localStorage`), non entra nello
  stato condiviso e non raggiunge gli altri dispositivi — su ognuno la scrivi
  una volta, se vuoi;
- **Scollega** la cancella insieme al resto;
- se la password non è più valida (cambiata nel software contabilità) viene
  **dimenticata subito** invece di riprovare all'infinito, e la scheda te lo
  dice.

Lo stato della scheda lo dichiara sempre: *«password ricordata, non serve
ricollegare»* quando la lettura è attiva, *«password ricordata: rientro
automatico, premi Aggiorna»* quando la sessione è appena scaduta.

Il compromesso, detto chiaro: chi ha accesso a quel browser può leggere quella
password. Se il dispositivo è condiviso, togli la spunta e continua a inserirla
a mano.
