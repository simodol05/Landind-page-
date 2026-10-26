# Artide · Preventivo integrativo (Allegato A) e checklist (Allegato B)

`Artide-preventivo-integrativo.pdf` e' il file da aprire sull'iPad: campi e caselle si compilano
direttamente, le firme si fanno con lo strumento Firma/Markup.

Per modificarlo:

1. cambia testi e prezzi in `preventivo.html` (i prezzi proposti sono negli attributi `data-v`);
2. rigenera con `node render.js && python3 campi.py`.

`render.js` impagina la pagina con Chromium e salva le posizioni dei campi, `campi.py` li appoggia sul PDF.
