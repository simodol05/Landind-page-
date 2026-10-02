// Ripresa frame per frame del sito ABYSSA (copia locale) per lo schermo del monitor.
// Viewport desktop 1280x637 a 2x, 30 fps, scorrimento e azioni lette da ../remotion/src/timeline.json.
// uso: node screen.mjs   -> ../remotion/public/footage/schermo.mp4
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openPage, freezeTime, SCREEN_VIEWPORT, LAUNCH } from './page-setup.mjs';

const TL = JSON.parse(fs.readFileSync(path.resolve('../remotion/src/timeline.json'), 'utf8'));
const FPS = TL.fps;
const EV = TL.events;
const FRAMES_DIR = process.env.FRAMES_DIR || '/tmp/claude-0/frames-schermo-abyssa';
const OUT = path.resolve('../remotion/public/footage/schermo.mp4');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null; // prova: solo alcuni secondi
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// stessa curva usata nel montaggio (src/scroll.ts)
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export function scrollAt(t) {
  const k = TL.scroll;
  if (t <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, y0] = k[i]; const [t1, y1] = k[i + 1];
    if (t <= t1) return y0 + (y1 - y0) * easeInOut((t - t0) / (t1 - t0));
  }
  return k[k.length - 1][1];
}

const browser = await chromium.launch(LAUNCH);
fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });
const { context, page } = await openPage(browser, { ...SCREEN_VIEWPORT, dpr: 2 });
// il puntatore parte fuori dagli elementi interattivi
await page.mouse.move(1275, 300);
// il modello 3D si carica quando entra nello schermo: lo prepariamo prima di fermare il tempo
await page.evaluate(() => window.scrollTo({ top: 3720, behavior: 'instant' }));
await page.waitForTimeout(2500);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await page.waitForTimeout(800);
await freezeTime(page);
for (let i = 0; i < 60; i++) await page.evaluate(() => window.__tick(1000 / 60));
for (let i = 0; i < 6; i++) await page.evaluate(() => window.__nextFrame());

const n = Math.round(TL.screenCaptureUntil * FPS);
const t0 = Date.now();
let filtered = false; let parked = false;
for (let f = 0; f < n; f++) {
  const t = f / FPS;
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), scrollAt(t));
  // puntatore sul modello 3D: la prospettiva cambia davvero (funzione del sito)
  if (t >= EV.pointer.from && t <= EV.pointer.to) {
    const p = easeInOut((t - EV.pointer.from) / (EV.pointer.to - EV.pointer.from));
    await page.mouse.move(EV.pointer.x[0] + (EV.pointer.x[1] - EV.pointer.x[0]) * p, EV.pointer.y[0] + (EV.pointer.y[1] - EV.pointer.y[0]) * p);
  }
  if (!parked && t >= EV.pointerPark) { parked = true; await page.mouse.move(1275, 300); }
  // filtro reale delle esperienze: "With family"
  if (!filtered && t >= EV.filterFamily) { filtered = true; await page.evaluate(() => document.querySelector('[data-filter="families"]').click()); }
  await page.evaluate(() => window.__nextFrame().then(() => window.__nextFrame()));
  await page.evaluate(() => { window.__tick(1000 / 60); window.__tick(1000 / 60); window.__syncAnims(); });
  if (ONLY && !ONLY.some((s) => Math.abs(s - t) < 0.5 / FPS)) continue;
  await page.screenshot({ path: path.join(FRAMES_DIR, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 93 });
  if (f % 60 === 0) console.log(f, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
await context.close();
await browser.close();
if (!ONLY) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(FRAMES_DIR, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT]);
  console.log('ok', OUT);
}
