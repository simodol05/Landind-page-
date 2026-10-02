// Preparazione comune della pagina per le riprese (stessa pipeline del video SL "servizi extra").
// Si riprende la COPIA LOCALE del sito (cartella sito-locale/, scaricata da
// https://taupe-lollipop-e2a921.netlify.app/): il sito pubblico non viene toccato.
// Avvio del server locale:  python3 -m http.server 8766 --directory sito-locale
export const URL = process.env.LANDING_URL || 'http://localhost:8766/';

// Schermo del monitor: 992x494 px nel fotogramma -> viewport desktop 1280x637 (stesso rapporto 2,01).
export const SCREEN_VIEWPORT = { width: 1280, height: 637 };

// WebGL software (SwiftShader): la medusa 3D e il modello 3D del sito si vedono anche senza GPU.
export const LAUNCH = { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export async function openPage(browser, { width = 1280, height = 637, dpr = 2, mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile,
    locale: 'en-GB', reducedMotion: 'no-preference',
  });
  await context.route('**/.netlify/**', (r) => r.abort());
  await context.addInitScript(() => {
    // generatore pseudo-casuale con seme fisso: la scena 3D e' sempre la stessa
    let s = 20261002 >>> 0;
    Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // data fissa: il pianificatore della visita mostra sempre lo stesso giorno
    const D = Date; const fixed = new D('2026-10-02T10:00:00').getTime();
    // eslint-disable-next-line no-global-assign
    Date = class extends D { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  return { context, page };
}

// Da qui in poi requestAnimationFrame e le animazioni CSS avanzano solo quando lo diciamo noi.
export async function freezeTime(page) {
  await page.evaluate(() => {
    const realRAF = window.requestAnimationFrame.bind(window);
    let queue = new Map(); let nextId = 1;
    window.requestAnimationFrame = (cb) => { const id = nextId++; queue.set(id, cb); return id; };
    window.cancelAnimationFrame = (id) => { queue.delete(id); };
    window.__vt = performance.now(); // continua dal tempo reale: nessun salto all indietro
    window.__tick = (ms) => {
      window.__vt += ms;
      const q = queue; queue = new Map();
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
