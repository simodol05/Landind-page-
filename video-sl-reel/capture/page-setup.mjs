// Preparazione comune della pagina per le riprese: niente prezzi, niente badge Netlify,
// casualita' dei petali riproducibile e tempo di animazione controllato frame per frame.
export const URL = 'https://ilrusticoserviziaggiuntivi.netlify.app/';

// Prezzi nascosti SOLO nel browser di ripresa (il sito online non viene toccato).
export const HIDE_PRICES_CSS = `
  .riquadro__prezzo, .fascia__prezzo, .rf-price { display: none !important; }
`;

export async function openPage(browser, { width = 432, height = 768, dpr = 3.75 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true,
    locale: 'it-IT', reducedMotion: 'no-preference',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });
  // Il badge "Powered by Netlify" e' un'aggiunta dell'hosting, non fa parte della pagina.
  await context.route('**/.netlify/scripts/**', (r) => r.abort());
  await context.addInitScript(() => {
    // generatore pseudo-casuale con seme fisso: i petali cadono sempre allo stesso modo
    let s = 20261001 >>> 0;
    Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE_PRICES_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(3500); // la pagina mostra tutti i riquadri entro 3 s
  // Da qui in poi requestAnimationFrame e le animazioni CSS avanzano solo quando lo diciamo noi.
  await page.evaluate(() => {
    const realRAF = window.requestAnimationFrame.bind(window);
    window.__realRAF = realRAF;
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
        // al primo incontro si conserva il punto in cui l'animazione si trova gia'
        if (!window.__seenAnims.has(a)) window.__seenAnims.set(a, (a.currentTime || 0) - window.__vt);
        a.pause();
        a.currentTime = window.__vt + window.__seenAnims.get(a);
      }
    };
    window.__nextFrame = () => new Promise((r) => realRAF(() => r()));
  });
  // lascia esaurire eventuali callback reali gia' in coda
  for (let i = 0; i < 4; i++) await page.evaluate(() => window.__nextFrame());
  return { context, page };
}

export async function layout(page) {
  return page.evaluate(() => {
    const top = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height) }; };
    return {
      docH: document.documentElement.scrollHeight, vh: innerHeight,
      marchio: top('.marchio'), orari: top('#orari-flessibili'), orariCta: top('.rf-cta'),
      orariOpt1: top('.rf-option'),
      essenza: top('#essenza'), momento: top('.riquadro--evidenza'), sogno: top('.riquadro--premium'),
      fascia: top('.fascia'), colazione: top('#colazione'),
    };
  });
}
