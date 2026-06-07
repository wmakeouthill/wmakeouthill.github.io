// Otimizações pontuais de assets do frontend.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const kib = (n) => (n / 1024).toFixed(1) + ' KiB';
async function size(p) { return (await stat(p)).size; }

// 1) Avatar do chat: bolha exibe 62px, header 40px (object-fit: cover → quadrado).
//    160x160 cobre ~2,6x retina. Fonte: original 400x457 no backup.
const AV_SRC = 'D:/wmakeouthill.github.io/_assets-backup/public/ai-avatar.png';
for (const out of ['public/ai-avatar.webp', 'public/assets/ai-avatar.webp']) {
  const before = await size(out);
  await sharp(AV_SRC)
    .resize({ width: 160, height: 160, fit: 'cover', position: 'centre' })
    .webp({ quality: 82, effort: 6 })
    .toFile(out + '.tmp');
  const { rename } = await import('node:fs/promises');
  await rename(out + '.tmp', out);
  console.log(`avatar  ${out.padEnd(28)} ${kib(before)} -> ${kib(await size(out))}  (160x160)`);
}

// 2) OG image: PNG 571x1000 (212 KiB) → JPEG mozjpeg q85 (foto). Mesmas dimensões.
const OG_PNG = 'public/assets/wesley-photo.png';
const OG_JPG = 'public/assets/wesley-photo.jpg';
const ogBefore = await size(OG_PNG);
await sharp(OG_PNG).jpeg({ quality: 85, mozjpeg: true }).toFile(OG_JPG);
console.log(`OG      ${OG_JPG.padEnd(28)} ${kib(ogBefore)} -> ${kib(await size(OG_JPG))}`);
