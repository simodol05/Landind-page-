import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { openPage, layout } from './page-setup.mjs';
const b = await chromium.launch();
const { page } = await openPage(b);
console.log(JSON.stringify(await layout(page), null, 1));
// prezzi ancora visibili?
console.log('testo con €:', await page.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const out = []; let n; while ((n = w.nextNode())) { if (/€|\d+,\d\d/.test(n.nodeValue)) { const el = n.parentElement; const cs = getComputedStyle(el); if (el.offsetParent !== null && cs.visibility !== 'hidden' && !el.closest('template')) out.push(n.nodeValue.trim()); } } return out; }));
await page.screenshot({ path: '/tmp/claude-0/explore/shots/noprice_top.jpg', quality: 85 });
await page.screenshot({ path: '/tmp/claude-0/explore/shots/noprice_full.jpg', quality: 70, fullPage: true });
await b.close();
