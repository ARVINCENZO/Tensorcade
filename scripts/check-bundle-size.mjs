/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST_ROOT = path.resolve('apps/web/dist');
const DIST_DIR = path.join(DIST_ROOT, 'assets');
const INDEX_HTML = path.join(DIST_ROOT, 'index.html');
const MAX_SHELL_GZIP_BYTES = 250 * 1024; // 250 KB gzip budget per docs/QUALITY_BAR.md
const MAX_SHELL_CSS_GZIP_BYTES = 50 * 1024; // 50 KB gzip ceiling for initial shell CSS

// Per-world lazy asset pack budgets per docs/adr/ADR-018-asset-budgeting-dynamic-loading.md
const WORLD_BUDGETS_BYTES = {
  1: 1.5 * 1024 * 1024,
  2: 2.0 * 1024 * 1024,
  3: 2.5 * 1024 * 1024,
  4: 2.5 * 1024 * 1024,
  5: 4.0 * 1024 * 1024,
};

if (!fs.existsSync(DIST_DIR) || !fs.existsSync(INDEX_HTML)) {
  console.error(`Dist assets or index.html not found at: ${DIST_ROOT}`);
  console.error('Run "pnpm --filter @tensorcade/web run build" before checking bundle size.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_DIR);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

if (jsFiles.length === 0) {
  console.error('No JavaScript assets found in dist directory.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
const shellFileSet = new Set();
const shellCssSet = new Set();

for (const match of indexHtml.matchAll(/<script\b[^>]*>/gi)) {
  const srcMatch = match[0].match(/\bsrc=["']\/assets\/([^"']+\.js)["']/i);
  if (srcMatch) {
    shellFileSet.add(srcMatch[1]);
  }
}

for (const match of indexHtml.matchAll(/<link\b[^>]*>/gi)) {
  const tag = match[0];
  if (/\brel=["']modulepreload["']/i.test(tag)) {
    const hrefMatch = tag.match(/\bhref=["']\/assets\/([^"']+\.js)["']/i);
    if (hrefMatch) {
      shellFileSet.add(hrefMatch[1]);
    }
  }
  if (/\brel=["']stylesheet["']/i.test(tag)) {
    const hrefMatch = tag.match(/\bhref=["']\/assets\/([^"']+\.css)["']/i);
    if (hrefMatch) {
      shellCssSet.add(hrefMatch[1]);
    }
  }
}

if (shellFileSet.size === 0) {
  console.error('No initial shell JS assets referenced in apps/web/dist/index.html.');
  process.exit(1);
}

const shellFiles = jsFiles.filter((f) => shellFileSet.has(f));
const lazyFiles = jsFiles.filter((f) => !shellFileSet.has(f));
const shellCssFiles = cssFiles.filter((f) => shellCssSet.has(f));

for (const expected of shellFileSet) {
  if (!jsFiles.includes(expected)) {
    console.error(`Referenced shell JS asset missing from dist/assets: ${expected}`);
    process.exit(1);
  }
}

function measureFile(file) {
  const filePath = path.join(DIST_DIR, file);
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  return {
    file,
    rawBytes: content.length,
    rawKb: (content.length / 1024).toFixed(2),
    gzipBytes: gzipped.length,
    gzipKb: (gzipped.length / 1024).toFixed(2),
  };
}

let totalGzipBytes = 0;
console.log('--- Bundle Size Budget Check (Budget: <= 250 KB gzip JS, <= 50 KB gzip CSS) ---');
console.log('Initial Shell JS Chunks (from index.html):');

for (const file of shellFiles) {
  const info = measureFile(file);
  console.log(`- ${info.file}: raw = ${info.rawKb} KB, gzip = ${info.gzipKb} KB`);
  totalGzipBytes += info.gzipBytes;
}

let totalCssGzipBytes = 0;
if (shellCssFiles.length > 0) {
  console.log('\nInitial Shell CSS Assets (from index.html):');
  for (const file of shellCssFiles) {
    const info = measureFile(file);
    console.log(`- ${info.file}: raw = ${info.rawKb} KB, gzip = ${info.gzipKb} KB`);
    totalCssGzipBytes += info.gzipBytes;
  }
}

if (lazyFiles.length > 0) {
  console.log('\nLazy-Loaded Chunks (informational, excluded from shell budget):');
  for (const file of lazyFiles) {
    const info = measureFile(file);
    console.log(`- ${info.file}: raw = ${info.rawKb} KB, gzip = ${info.gzipKb} KB`);
  }
}

const worldTotals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (const file of files) {
  const worldMatch = file.match(/^(?:w|world[-_]?)(1|2|3|4|5)\b/i);
  if (worldMatch) {
    const worldNum = Number(worldMatch[1]);
    worldTotals[worldNum] += fs.statSync(path.join(DIST_DIR, file)).size;
  }
}

console.log('\nPer-World Lazy Asset Pack Budgets (ADR-018):');
let worldBudgetFailed = false;
for (const [worldNum, budgetBytes] of Object.entries(WORLD_BUDGETS_BYTES)) {
  const actualBytes = worldTotals[Number(worldNum)] ?? 0;
  const actualMb = (actualBytes / (1024 * 1024)).toFixed(3);
  const budgetMb = (budgetBytes / (1024 * 1024)).toFixed(2);
  console.log(`- World ${worldNum}: ${actualMb} MB / ${budgetMb} MB`);
  if (actualBytes > budgetBytes) {
    worldBudgetFailed = true;
  }
}

const totalGzipKb = (totalGzipBytes / 1024).toFixed(2);
const totalCssGzipKb = (totalCssGzipBytes / 1024).toFixed(2);
console.log(`\nMain Shell JS Gzip Total: ${totalGzipKb} KB / 250 KB`);
console.log(`Main Shell CSS Gzip Total: ${totalCssGzipKb} KB / 50 KB`);

if (totalGzipBytes > MAX_SHELL_GZIP_BYTES) {
  console.error(`❌ FAILED: Shell bundle size (${totalGzipKb} KB) exceeds budget of 250 KB gzip!`);
  process.exit(1);
}

if (totalCssGzipBytes > MAX_SHELL_CSS_GZIP_BYTES) {
  console.error(`❌ FAILED: Shell CSS size (${totalCssGzipKb} KB) exceeds budget of 50 KB gzip!`);
  process.exit(1);
}

if (worldBudgetFailed) {
  console.error('❌ FAILED: One or more world lazy asset packs exceed ADR-018 budget!');
  process.exit(1);
}

console.log('✅ PASSED: Shell JS/CSS and per-world budgets conform to docs/QUALITY_BAR.md.');
