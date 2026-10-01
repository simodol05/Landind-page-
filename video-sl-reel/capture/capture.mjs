// Ripresa frame per frame della landing reale (30 fps, 1620x2880).
// uso: node capture.mjs A [B ...]   -> /tmp/.../frames/<shot>/00000.jpg + footage/<shot>.mp4
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './page-setup.mjs';
import { SHOTS } from './shots.mjs';

const FPS = 30;
const FRAMES_DIR = process.env.FRAMES_DIR || '/tmp/claude-0/frames';
const OUT_DIR = path.resolve('../remotion/public/footage');
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
for (const name of process.argv.slice(2)) {
  const shot = SHOTS[name];
  const dir = path.join(FRAMES_DIR, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { context, page } = await openPage(browser);
  const n = Math.round(shot.duration * FPS);
  const done = new Set();
  // preriscaldamento: i petali partono gia' distribuiti nello schermo
  await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), shot.scroll(0));
  await page.evaluate(() => window.__nextFrame());
  await page.evaluate(() => { for (let i = 0; i < 240; i++) window.__tick(1000 / 60); window.__syncAnims(); });
  for (let i = 0; i < 8; i++) await page.evaluate(() => window.__nextFrame());
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    for (const [i, a] of shot.actions.entries()) {
      if (!done.has(i) && t >= a.t) { await page.evaluate(a.run); done.add(i); }
    }
    await page.evaluate((y) => window.scrollTo({ top: y, left: 0, behavior: 'instant' }), shot.scroll(t));
    await page.evaluate(() => window.__nextFrame().then(() => window.__nextFrame()));
    // due passi da 1/60 s per ogni frame a 30 fps: i petali cadono alla velocita' reale
    await page.evaluate(() => { window.__tick(1000 / 60); window.__tick(1000 / 60); window.__syncAnims(); });
    await page.screenshot({ path: path.join(dir, String(f).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 95 });
    if (f % 60 === 0) console.log(name, f, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  await context.close();
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    path.join(OUT_DIR, `ripresa_${name}.mp4`)]);
  console.log('ok', name);
}
await browser.close();
