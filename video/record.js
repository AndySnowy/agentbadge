// AgentBadge demo video recorder — Playwright walkthrough of the live site.
// Produces a ~60s 1280x720 screen recording (no audio) showing Home, Mint,
// My Badges, and Board, plus the connect-wallet / Agent ID gating prompt.
const { chromium } = require('playwright');

const SITE = 'https://andysnowy.github.io/agentbadge/';
const OUT_DIR = __dirname + '/raw';
const CHROME = '/home/hatch/.agent-browser/browsers/chrome-157.0.8103.78/chrome';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function smoothScroll(page, targetY, durationMs) {
  const startY = await page.evaluate(() => window.scrollY);
  const steps = Math.max(10, Math.round(durationMs / 50));
  for (let i = 1; i <= steps; i++) {
    const y = startY + ((targetY - startY) * i) / steps;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await sleep(durationMs / steps);
  }
}

(async () => {
  // Chrome cannot use the VM egress proxy directly (see local-proxy.js):
  // route through the local unauthenticated forward proxy on :8888.
  const browser = await chromium.launch({
    executablePath: CHROME,
    proxy: { server: 'http://127.0.0.1:8888' },
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-certificate-errors',
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const t0 = Date.now();
  const mark = (label) =>
    console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${label}`);

  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000); // let live stats populate
  mark('home loaded');

  // Home: slow scroll down through badges + collections, then back up.
  const homeHeight = await page.evaluate(() => document.body.scrollHeight);
  await smoothScroll(page, Math.min(homeHeight - 720, 900), 6000);
  mark('home scrolled down');
  await sleep(2000);
  await smoothScroll(page, 0, 3000);
  await sleep(1000);

  // Mint page.
  await page.click('button.nav-btn[data-nav="mint"]');
  await sleep(3000);
  mark('mint page');
  const mintHeight = await page.evaluate(() => document.body.scrollHeight);
  await smoothScroll(page, Math.min(mintHeight - 720, 700), 5000);
  await sleep(1500);
  await smoothScroll(page, 0, 2000);

  // Connect wallet — shows the Agent ID gating prompt (no wallet installed).
  await page.click('#connect-btn');
  await sleep(4000);
  mark('connect prompt shown');
  await page.keyboard.press('Escape');
  await sleep(1000);

  // My Badges.
  await page.click('button.nav-btn[data-nav="mybadges"]');
  await sleep(3500);
  mark('my badges');

  // Board.
  await page.click('button.nav-btn[data-nav="board"]');
  await sleep(4000);
  mark('board');

  // Back home, settle on the hero.
  await page.click('button.nav-btn[data-nav="home"]');
  await sleep(3000);
  mark('done');

  await context.close();
  await browser.close();
  console.log('TOTAL seconds:', ((Date.now() - t0) / 1000).toFixed(1));
})().catch((e) => {
  console.error('RECORDER FAILED:', e);
  process.exit(1);
});
