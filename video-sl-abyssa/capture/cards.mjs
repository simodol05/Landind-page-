// Pannelli in primo piano: finestre reali del sito fotografate a 2x (nessuna ricostruzione).
//  - mondo.png  : scheda "Bioluminescent Abyss" (clic sul mondo 05 nella griglia "Six worlds")
//  - visita.png : pianificatore "Plan your descent" (clic su "Get tickets")
// uso: node cards.mjs   -> ../remotion/public/schede/*.png + schede.json
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { openPage, LAUNCH } from './page-setup.mjs';

const OUT = path.resolve('../remotion/public/schede');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(LAUNCH);
const { context, page } = await openPage(browser, { width: 1280, height: 900, dpr: 2 });
const meta = {};

async function shoot(name) {
  const d = page.locator('dialog[open]');
  await page.waitForTimeout(1200);
  const box = await d.boundingBox();
  const radius = await d.evaluate((e) => parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0);
  await d.screenshot({ path: path.join(OUT, name + '.png') });
  meta[name] = { w: Math.round(box.width), h: Math.round(box.height), radius };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
}

await page.evaluate(() => document.querySelector('#worlds').scrollIntoView());
await page.waitForTimeout(1200);
await page.click('[data-world="4"]');
await shoot('mondo');

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.click('header [data-book]');
await shoot('visita');

fs.writeFileSync(path.join(OUT, 'schede.json'), JSON.stringify(meta, null, 2));
console.log(meta);
await context.close();
await browser.close();
