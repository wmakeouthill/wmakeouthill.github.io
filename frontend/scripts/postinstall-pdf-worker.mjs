/**
 * Script de pós-instalação para copiar o pdf.worker do pdfjs-dist
 * para public/assets de forma cross-platform (Windows / Unix).
 */

import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const projectRoot = path.resolve(__dirname, '..');
    const source = path.join(
      projectRoot,
      'node_modules',
      'pdfjs-dist',
      'legacy',
      'build',
      'pdf.worker.min.mjs'
    );
    const targetDir = path.join(projectRoot, 'public', 'assets');
    const target = path.join(targetDir, 'pdf.worker.min.mjs');

    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(source, target);
    console.log('[postinstall] pdf.worker.min.mjs copiado para public/assets com sucesso.');
  } catch (error) {
    // Não falhar o build se o arquivo não existir ou algo der errado
    console.warn('[postinstall] Não foi possível copiar pdf.worker.min.mjs:', error.message);
  }
}

main().catch((error) => {
  console.warn('[postinstall] Erro inesperado ao copiar pdf.worker.min.mjs:', error.message);
});


