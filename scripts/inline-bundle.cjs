const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const assetsDir = path.join(distDir, 'assets');
const subirDir = path.join(rootDir, 'SUBIR_A_GITHUB_WEB');

const distHtmlPath = path.join(distDir, 'index.html');
const distHtml = fs.readFileSync(distHtmlPath, 'utf8');

const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith('.css'));
const jsFile = files.find((f) => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  throw new Error('No se encontraron los archivos .css o .js en dist/assets');
}

// Ajustar rutas relativas de fuentes al incrustar el CSS en el index.html raíz
const cssContent = fs
  .readFileSync(path.join(assetsDir, cssFile), 'utf8')
  .replace(/url\(\.\/atkinson-hyperlegible-/g, 'url(./assets/atkinson-hyperlegible-');

// Escapar cualquier posible </script dentro de literales del bundle JS
const jsContent = fs
  .readFileSync(path.join(assetsDir, jsFile), 'utf8')
  .replace(/<\/script/gi, '<\\/script');

// Usar callback () => ... en .replace() para que los símbolos '$' del JS minificado ($', $&, $_)
// JAMÁS sean interpretados como patrones de sustitución RegExp.
const inlinedHtml = distHtml
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>\n${cssContent}\n</style>`)
  .replace(/<script type="module"[^>]*><\/script>/, () => `<script type="module">\n${jsContent}\n</script>`);

// Copiar dist/* a SUBIR_A_GITHUB_WEB y dist/assets/* a ./assets en la raíz
fs.cpSync(distDir, subirDir, { recursive: true, force: true });
fs.cpSync(assetsDir, path.join(rootDir, 'assets'), { recursive: true, force: true });

// Guardar el index.html autocontenido y limpio en la raíz (para GitHub Pages y apertura directa)
fs.writeFileSync(path.join(rootDir, 'index.html'), inlinedHtml, 'utf8');

const scriptOpenCount = (inlinedHtml.match(/<script/gi) || []).length;
const scriptCloseCount = (inlinedHtml.match(/<\/script>/gi) || []).length;
const bodyOpenCount = (inlinedHtml.match(/<body/gi) || []).length;
const bodyCloseCount = (inlinedHtml.match(/<\/body>/gi) || []).length;

console.log(
  `[inline-bundle] Completado: index.html (${inlinedHtml.length} bytes) | <script>: ${scriptOpenCount}/${scriptCloseCount} | <body>: ${bodyOpenCount}/${bodyCloseCount}`
);
