import { test, expect, Page, ConsoleMessage } from '@playwright/test';

const DEFAULT = ['movie', 'tv', 'anime', 'game', 'book'] as const;
const CATS = (process.env.CATS?.split(',').map(s => s.trim()).filter(Boolean) ?? DEFAULT) as unknown as typeof DEFAULT;
const MODE = 'popular';

async function countLoadedImages(page: Page) {
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    return imgs.filter(img => img.isConnected && img.complete && img.naturalWidth > 0 && typeof img.currentSrc === 'string' && img.currentSrc.startsWith('https://')).length;
  });
}

test.describe('Browse grid images', () => {
  for (const cat of CATS) {
    test(`at least one ${cat} image loads`, async ({ page, baseURL }) => {
      const logs: string[] = [];
      page.on('console', (msg: ConsoleMessage) => {
        const t = msg.type();
        const txt = msg.text();
        if (t === 'warning' || t === 'error') logs.push(txt);
      });

      await page.goto(`/browse?cat=${cat}&mode=${MODE}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForLoadState('networkidle');

      await expect.poll(async () => await countLoadedImages(page), { message: `No real images detected for ${cat} on ${baseURL}` }).toBeGreaterThan(0);

      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await page.waitForTimeout(300);
      const cspRefusals = logs.filter(l => /Refused to load the image/i.test(l));
      expect(cspRefusals, `CSP blocked images for ${cat}: ${cspRefusals.join('\n')}`).toHaveLength(0);
    });
  }
});
