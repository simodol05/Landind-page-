// Schede in primo piano: componenti REALI della landing fotografati dalla copia locale
// (layout da telefono, 3x per la nitidezza). Per tenerle compatte si nascondono alcune voci
// con display:none, solo nel browser di ripresa: nessun testo inventato, nessun prezzo.
// uso: node cards.mjs   -> ../remotion/public/schede/<nome>.png + schede.json
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './page-setup.mjs';

const OUT = path.resolve('../remotion/public/schede');
fs.mkdirSync(OUT, { recursive: true });

const NO_PETALS = '#petali, #petali-avanti { display: none !important; }';
export const CARDS = {
  // 4-8 s: pacchetto romantico in evidenza
  momento: { sel: '#momento', css: '#momento .voce:nth-child(n+3), #momento .riquadro__chiusura { display: none !important; }' },
  // "Colazioni per due"
  colazione: { sel: '#colazione', css: '#colazione .voce:nth-child(n+3), #colazione .riquadro__chiusura { display: none !important; }' },
  // "Sorprese romantiche"
  essenza: { sel: '#essenza', css: '#essenza .voce:nth-child(n+4), #essenza .riquadro__chiusura { display: none !important; }' },
  // "Orari flessibili" (resta visibile la nota: servizio soggetto a disponibilita' e conferma)
  orari: { sel: '.rf-card', css: '.rf-option:nth-child(n+3) { display: none !important; }' },
};

const browser = await chromium.launch();
const meta = {};
for (const [name, c] of Object.entries(CARDS)) {
  const { context, page } = await openPage(browser, { width: 430, height: 1400, dpr: 3, extraCss: NO_PETALS + c.css });
  const el = page.locator(c.sel).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const info = await el.evaluate((e) => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { w: r.width, h: r.height, radius: parseFloat(cs.borderTopLeftRadius) || 0, text: e.innerText };
  });
  if (/€|\d+,\d{2}/.test(info.text)) throw new Error(`prezzo visibile nella scheda ${name}: ${info.text}`);
  await el.screenshot({ path: path.join(OUT, `${name}.png`) });
  meta[name] = { w: Math.round(info.w), h: Math.round(info.h), radius: info.radius };
  console.log(name, meta[name]);
  await context.close();
}
fs.writeFileSync(path.join(OUT, 'schede.json'), JSON.stringify(meta, null, 2));
await browser.close();
