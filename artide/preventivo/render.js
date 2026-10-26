// Impagina una pagina HTML in PDF con Chromium e salva la posizione di ogni campo da compilare.
// Uso: node render.js aggiunte.html  ->  base.pdf + campi.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const dir = __dirname;
  const source = process.argv[2] || 'aggiunte.html';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(dir, source), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });

  const fields = await page.evaluate(() => {
    const pages = [...document.querySelectorAll('.page, .slide')];
    const out = [];
    pages.forEach((p, i) => {
      const pr = p.getBoundingClientRect();
      p.querySelectorAll('[data-f],[data-c]').forEach(el => {
        const r = el.getBoundingClientRect();
        out.push({
          page: i,
          kind: el.dataset.f ? 'text' : 'check',
          name: el.dataset.f || el.dataset.c,
          value: el.dataset.v || '',
          multi: el.dataset.multi === '1',
          light: el.dataset.ink === 'light',
          // px CSS -> punti PDF (1px = 0.75pt), origine in alto a sinistra della pagina
          x: (r.left - pr.left) * 0.75,
          y: (r.top - pr.top) * 0.75,
          w: r.width * 0.75,
          h: r.height * 0.75,
        });
      });
    });
    return out;
  });

  await page.pdf({ path: path.join(dir, 'base.pdf'), preferCSSPageSize: true, printBackground: true });
  fs.writeFileSync(path.join(dir, 'campi.json'), JSON.stringify(fields, null, 1));
  console.log('pagine impaginate, campi:', fields.length);
  await browser.close();
})();
