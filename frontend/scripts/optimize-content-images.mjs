// Converte imagens raster do repo de conteúdo (certificados-wesley) para WebP.
// Mantém o mesmo basename (preserva o matching por displayName no frontend) e
// remove o original PNG/JPG. GIF/SVG/WebP são ignorados.
//
// Uso: node scripts/optimize-content-images.mjs <pasta>
import sharp from 'sharp';
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

const dir = process.argv[2] || 'D:/certificados-wesley/portifolio_imgs';
// O card exibe num box ~400x168 (object-fit: contain). 800x500 cobre retina ~2.5x
// com folga para banners largos, sem desperdiçar bytes.
const MAX_WIDTH = 800;
const MAX_HEIGHT = 500;
const QUALITY = 80;
const RASTER = new Set(['.png', '.jpg', '.jpeg']);

const files = await readdir(dir);
let totalBefore = 0;
let totalAfter = 0;
const results = [];

for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (!RASTER.has(ext)) continue;

  const src = join(dir, file);
  const out = join(dir, basename(file, extname(file)) + '.webp');

  const before = (await stat(src)).size;
  await sharp(src)
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(out);
  let after = (await stat(out)).size;

  if (after >= before) {
    // WebP não compensou (imagem já minúscula): mantém o original.
    await unlink(out);
    after = before;
    results.push({ file, before, after, kept: true });
  } else {
    await unlink(src);
    results.push({ file, before, after });
  }

  totalBefore += before;
  totalAfter += after;
}

results.sort((a, b) => b.before - a.before);
const kib = (n) => (n / 1024).toFixed(1).padStart(8) + ' KiB';
for (const r of results) {
  if (r.kept) {
    console.log(`${kib(r.before)} -> ${kib(r.after)}  (mantido original)  ${r.file}`);
    continue;
  }
  const pct = r.before ? Math.round((1 - r.after / r.before) * 100) : 0;
  console.log(`${kib(r.before)} -> ${kib(r.after)}  (-${pct}%)  ${r.file}`);
}
console.log('─'.repeat(60));
console.log(`TOTAL: ${kib(totalBefore)} -> ${kib(totalAfter)}  (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)  em ${results.length} arquivos`);
