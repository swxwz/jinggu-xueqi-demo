import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDir = fileURLToPath(new URL('../pages-dist/', import.meta.url));
const inlineDir = fileURLToPath(new URL('../pages-inline/', import.meta.url));
const files = await readdir(outputDir);
const scriptName = files.find((name) => name.endsWith('.js'));
const styleName = files.find((name) => name.endsWith('.css'));

if (!scriptName || !styleName) throw new Error('GitHub Pages assets were not generated.');

const [html, script, style] = await Promise.all([
  readFile(join(outputDir, 'index.html'), 'utf8'),
  readFile(join(outputDir, scriptName), 'utf8'),
  readFile(join(outputDir, styleName), 'utf8'),
]);

const inlineHtml = html
  // Replacement functions keep `$&`, `$\`` and similar sequences inside
  // minified bundles from being interpreted as String.replace tokens.
  .replace(/\s*<script type="module"[^>]*src="[^"]+"><\/script>/, () => `\n    <script type="module">${script}</script>`)
  .replace(/\s*<link rel="stylesheet"[^>]*>/, () => `\n    <style>${style}</style>`);

await mkdir(inlineDir, { recursive: true });
await writeFile(join(inlineDir, 'index.html'), inlineHtml, 'utf8');
