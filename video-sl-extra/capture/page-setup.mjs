// Preparazione comune della pagina per le riprese (riuso della pipeline del reel SL).
// Si riprende la COPIA LOCALE della landing (cartella sito-locale/, scaricata da
// https://ilrusticoserviziaggiuntivi.netlify.app/): il sito pubblico non viene toccato.
// Avvio del server locale:  python3 -m http.server 8765 --directory sito-locale
export const URL = process.env.LANDING_URL || 'http://localhost:8765/';

// Prezzi nascosti SOLO nel browser di ripresa: display:none, la pagina si ricompone da sola.
export const HIDE_PRICES_CSS = `
  .riquadro__prezzo, .fascia__prezzo, .rf-price { display: none !important; }
`;

// Schermo del monitor: 992x494 px nel fotogramma -> viewport desktop 1280x637 (stesso rapporto 2,01).
export const SCREEN_VIEWPORT = { width: 1280, height: 637 };

export async function openPage(browser, { width = 1280, height = 637, dpr = 2, extraCss = '', mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile,
    locale: 'it-IT', reducedMotion: 'no-preference',
  });
  await context.route('**/.netlify/**', (r) => r.abort());
  await context.addInitScript(() => {
    // generatore pseudo-casuale con seme fisso: i petali cadono sempre allo stesso modo
    let s = 20261002 >>> 0;
    Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE_PRICES_CSS + extraCss });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3500); // la pagina mostra tutti i riquadri entro 3 s
  return { context, page };
}

// Da qui in poi requestAnimationFrame e le animazioni CSS avanzano solo quando lo diciamo noi.
export async function freezeTime(page) {
  await page.evaluate(() => {
    const realRAF = window.requestAnimationFrame.bind(window);
    let queue = [];
    window.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length; };
    window.cancelAnimationFrame = () => {};
    window.__vt = 0;
    window.__tick = (ms) => {
      window.__vt += ms;
      const q = queue; queue = [];
      q.forEach((cb) => { try { cb(window.__vt); } catch (e) {} });
    };
    window.__seenAnims = new Map();
    window.__syncAnims = () => {
      for (const a of document.getAnimations()) {
        if (!window.__seenAnims.has(a)) window.__seenAnims.set(a, (a.currentTime || 0) - window.__vt);
        a.pause();
        a.currentTime = window.__vt + window.__seenAnims.get(a);
      }
    };
    window.__nextFrame = () => new Promise((r) => realRAF(() => r()));
  });
  for (let i = 0; i < 4; i++) await page.evaluate(() => window.__nextFrame());
}
