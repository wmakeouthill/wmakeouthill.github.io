// Gera versões WebP otimizadas das imagens pesadas do hero e do chat.
// Mantém os PNGs originais (usados como OG image / fallback).
// Uso: node scripts/optimize-images.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { statSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// [origem PNG, destino WebP, largura máxima, qualidade]
const jobs = [
  ['public/assets/wesley-photo.png', 'public/assets/wesley-photo.webp', 600, 82],
  ['public/assets/ai-avatar.png', 'public/assets/ai-avatar.webp', 128, 80],
  ['public/ai-avatar.png', 'public/ai-avatar.webp', 128, 80],
];

const kb = (n) => (n / 1024).toFixed(1) + ' KiB';

for (const [src, out, width, quality] of jobs) {
  const srcPath = join(root, src);
  const outPath = join(root, out);
  const before = statSync(srcPath).size;

  await sharp(srcPath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(outPath);

  const after = statSync(outPath).size;
  const pct = (100 * (1 - after / before)).toFixed(0);
  console.log(`✔ ${src} (${kb(before)}) → ${out} (${kb(after)})  -${pct}%`);
}

console.log('\nConcluído.');
