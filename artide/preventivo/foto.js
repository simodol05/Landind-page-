// Salva una pagina HTML come immagine PNG. Uso: node foto.js espositore.html espositore.png 1000 1250
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [src, out, w, h] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, src), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(__dirname, out) });
  await browser.close();
})();
