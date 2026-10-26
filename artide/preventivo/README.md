# Artide · Le aggiunte al sito e il contratto

`Artide-aggiunte-e-contratto.pdf` e' il file da aprire sull'iPad (12 pagine):

1. copertina · 2. riepilogo delle tre aggiunte · 3. carrello WhatsApp · 4. sezione ingrosso ·
5. QR da banco · 6. pacchetti social · 7. cosa ci serve da Artide · 8. pagamento ·
9. firma · 10–11. contratto compilabile · 12. QR dei dati del bonifico.

Caselle e campi si compilano direttamente, le firme si fanno con lo strumento Firma/Markup.

Per rigenerarlo dopo aver modificato `aggiunte.html`:

```
node render.js aggiunte.html
python3 campi.py slide.pdf
python3 assembla.py slide.pdf contratto.pdf Artide-aggiunte-e-contratto.pdf
```

- `render.js` impagina le slide con Chromium e salva le posizioni dei campi;
- `campi.py` appoggia caselle e campi sulle slide;
- `assembla.py` inserisce le due pagine del contratto (`contratto.pdf`) dopo la slide della firma.
