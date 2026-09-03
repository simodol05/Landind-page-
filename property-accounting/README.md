# Rustico & Co. — Property Accounting (English build)

English translation of the accounting app currently published in Italian at
`https://regal-lamington-b59ecf.netlify.app/`.

The Italian site is **not touched**: this folder is a separate build meant to be
deployed as its own Netlify site, with its own link.

## What was translated

Everything the user sees: page title, sign-in screen, tab bar, dashboard KPIs and
charts, bookings, packages, expenses, monthly summary, owners, settings, the CSV
import wizard, every alert and confirmation dialog, and the source code comments.

Number formatting moved from `it-IT` to `en-GB`, so amounts read `€1,234.56`
instead of `€1.234,56`. Dates stay `DD/MM/YYYY`, which is correct English (UK)
and matches the original.

## What was deliberately *not* changed

**The values stored in the database.** Statuses (`Ricevuto`, `Da ricevere`,
`Pagato`, `Da pagare`), expense categories (`Manutenzione`, `Bollette`, ...) and
month keys (`Lug 2026`) are still written to Supabase exactly as the Italian app
writes them. A small lookup layer at the top of the script translates them only
for display:

```js
const ST_LABEL = {'Ricevuto':'Received','Da ricevere':'To receive', ...};
const opt = (val, sel, label) => '<option value="'+esc(val)+'" ...>'+esc(label)+'</option>';
```

That means the two versions share the same account and the same records without
corrupting anything: you can sign in on the English build, edit a booking, and
the Italian build still reads it correctly.

Also unchanged: the Supabase project and table, all calculations, the layout and
CSS, the CSV import aliases (they still recognise Italian Airbnb/Booking column
headers), owner names, and the property name and address.

## Deploying it as its own link

1. Netlify → **Add new site → Import an existing project** → pick this
   repository.
2. Set **Base directory** to `property-accounting`. Leave the build command
   empty; `netlify.toml` in this folder handles the rest.
3. Deploy, then **Site configuration → Change site name** to pick the English
   name you want, e.g. `property-accounting` →
   `https://property-accounting.netlify.app`.

The existing Italian site keeps its own link and is not affected.
