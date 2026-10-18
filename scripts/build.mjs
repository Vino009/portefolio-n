/**
 * Build statique sans dépendance.
 * Copie les fichiers publics dans ./public, remplace %%SITE_URL%% par l'URL du site
 * et génère sitemap.xml + robots.txt.
 *
 * URL du site, par ordre de priorité :
 *   1. SITE_URL (à définir dans Vercel si vous utilisez un domaine personnalisé)
 *   2. VERCEL_PROJECT_PRODUCTION_URL (fournie automatiquement par Vercel)
 *   3. VERCEL_URL (URL du déploiement en cours)
 *   4. http://localhost:3000 (développement local)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');

const withProtocol = (h) => (h ? (h.startsWith('http') ? h : `https://${h}`) : '');
const SITE_URL = (
  withProtocol(process.env.SITE_URL) ||
  withProtocol(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  withProtocol(process.env.VERCEL_URL) ||
  'http://localhost:3000'
).replace(/\/+$/, '');

const VERSION = Date.now().toString(36);

const ENTRIES = [
  'index.html', '404.html', 'style.css', 'main.js',
  'favicon.svg', 'favicon-32.png', 'apple-touch-icon.png',
  'en', 'cv', 'images', 'fonts',
];
const TEXT_EXT = new Set(['.html', '.css', '.js', '.xml', '.txt', '.svg']);

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const entry of ENTRIES) {
  const src = join(root, entry);
  if (!existsSync(src)) throw new Error(`Fichier manquant : ${entry}`);
  cpSync(src, join(out, entry), {
    recursive: true,
    filter: (p) => !p.endsWith('README.md'),
  });
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (TEXT_EXT.has(extname(p))) {
      const txt = readFileSync(p, 'utf8');
      let next = txt.replaceAll('%%SITE_URL%%', SITE_URL);
      // Version dans l'URL des fichiers CSS/JS : le navigateur recharge toujours la dernière version.
      if (p.endsWith('.html')) {
        next = next.replaceAll('href="/style.css"', `href="/style.css?v=${VERSION}"`)
                   .replaceAll('src="/main.js"', `src="/main.js?v=${VERSION}"`);
      }
      if (next !== txt) writeFileSync(p, next);
    }
  }
}
walk(out);

const today = new Date().toISOString().slice(0, 10);
const alt = `
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/"/>`;
writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>${alt}
  </url>
  <url>
    <loc>${SITE_URL}/en/</loc>
    <lastmod>${today}</lastmod>${alt}
  </url>
</urlset>
`);

writeFileSync(join(out, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`);

console.log(`Build terminé → public/ (SITE_URL = ${SITE_URL})`);
