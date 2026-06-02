/* eslint-disable */
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const indexHtml = resolve(distDir, 'index.html');

if (!existsSync(indexHtml)) {
  console.error('verify:build FAILED — apps/marketing/dist/index.html not found');
  process.exit(1);
}

console.log('verify:build PASSED — apps/marketing/dist/index.html exists');
