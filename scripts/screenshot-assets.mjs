#!/usr/bin/env node

/* global console, process */
/**
 * Screenshot all .store-assets/*.html templates to .output/store-assets/*.png
 * Uses Playwright (already a devDependency for e2e tests).
 */

import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { mkdir } from 'node:fs/promises';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, '.store-assets');
const OUT = resolve(ROOT, '.output', 'store-assets');

const VIEWPORTS = {
  '1280x800': { width: 1280, height: 800 },
  '1400x560': { width: 1400, height: 560 },
  '440x280': { width: 440, height: 280 },
};

function viewportFor(name) {
  if (name.includes('1400x560')) return VIEWPORTS['1400x560'];
  if (name.includes('440x280')) return VIEWPORTS['440x280'];
  return VIEWPORTS['1280x800'];
}

async function main() {
  const files = (await readdir(SRC)).filter((f) => f.endsWith('.html'));
  if (!files.length) {
    console.error('No HTML templates found in .store-assets/');
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();

  let ok = 0;
  for (const file of files) {
    const src = resolve(SRC, file);
    const png = basename(file, '.html') + '.png';
    const dst = resolve(OUT, png);
    const vp = viewportFor(file);

    const page = await context.newPage({ viewport: vp });
    await page.goto(`file://${src}`, { waitUntil: 'load' });
    await page.screenshot({ path: dst, fullPage: false });
    await page.close();

    console.log(`  ${file} → ${png} (${vp.width}×${vp.height})`);
    ok++;
  }

  await browser.close();
  console.log(`\nDone: ${ok} screenshots → .output/store-assets/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
