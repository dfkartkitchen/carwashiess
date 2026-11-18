// Car Washiess – sestavení webu z obsahu (content/page.json + content/site.json) do složky dist/
// Spouští Netlify při každé změně (i z administrace). Lokálně: node build.js
// Kontrola před nasazením: na produkci (Netlify CONTEXT=production) nebo s --strict se sestavení
// zastaví, když v textech zůstanou [hranaté závorky] nebo chybí soubor obrázku či videa.
const fs = require('fs');
const path = require('path');
const { renderPage, renderLegal } = require('./src/render.js');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));

const page = read('page.json');
const site = read('site.json');
const legal = read('legal.json');
const blocks = Array.isArray(page.blocks) ? page.blocks : [];

// --- kontrola obsahu ---
const STRICT = process.argv.includes('--strict') || process.env.CONTEXT === 'production';
const ALLOW_PLACEHOLDERS = /^(1|true|ano)$/i.test(process.env.ALLOW_PLACEHOLDERS || '');
const errors = [], placeholders = [];
const where = (p) => p.replace(/^page\.blocks\.(\d+)/, (m, i) => `blok ${+i + 1} (${blocks[i].type})`).replace(/^site\./, 'Kontakty, patička a SEO → ').replace(/^legal\./, 'Ochrana údajů a cookies → ');

function walk(v, p) {
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${p}.${i}`));
  if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => walk(x, `${p}.${k}`));
  if (typeof v !== 'string') return;
  if (/\[[^\]\n]+\]/.test(v)) placeholders.push(`${where(p)}: „${v}“`);
  // odkaz na soubor ve webu (obrázek, video), který v repozitáři není
  const m = /^\/((?:img|video)\/[^?#]+)$/.exec(v);
  if (m && !fs.existsSync(path.join(ROOT, decodeURI(m[1])))) errors.push(`Chybí soubor ${v} (${where(p)})`);
}
walk(page, 'page');
walk(site, 'site');
walk(legal, 'legal');

// scroll animace: složka musí obsahovat všechny snímky pro počítač i mobil a záložní snímky
for (const h of blocks.filter((b) => b.type === 'hero')) {
  const n = +h.frame_count || 181, dir = String(h.frames || '').replace(/^\//, '');
  const pad = (i) => String(i + 1).padStart(3, '0');
  const keys = String(h.frame_keys || '0,39,59,89,129,180').split(',').map(Number);
  const missing = [];
  for (let i = 0; i < n; i++) for (const d of ['desktop', 'mobile']) if (!fs.existsSync(path.join(ROOT, dir, d, `f_${pad(i)}.avif`))) missing.push(`${d}/f_${pad(i)}.avif`);
  for (const k of keys) if (!fs.existsSync(path.join(ROOT, dir, 'fallback', `f_${pad(k)}.webp`))) missing.push(`fallback/f_${pad(k)}.webp`);
  if (!dir || missing.length) errors.push(`Scroll animace: ve složce /${dir} chybí ${missing.length || 'všechny'} snímky (např. ${missing.slice(0, 3).join(', ')})`);
}

for (const t of ['hero', 'contact']) {
  if (blocks.filter((b) => b.type === t).length > 1) errors.push(`Blok „${t}“ může být na stránce jen jednou.`);
}
const anchors = blocks.map((b) => b.anchor).filter(Boolean);
anchors.filter((a, i) => anchors.indexOf(a) !== i).forEach((a) => errors.push(`Kotva „${a}“ je použitá u více bloků.`));

if (placeholders.length) {
  const msg = 'V textech zůstaly hranaté závorky (nevyplněné údaje):\n  ' + placeholders.join('\n  ');
  if (STRICT && !ALLOW_PLACEHOLDERS) errors.push(msg);
  else console.warn('Upozornění: ' + msg);
}
if (errors.length) {
  console.error('\nSestavení zastaveno, web se nezveřejní:\n- ' + errors.join('\n- ') + '\n');
  process.exit(1);
}

// --- sestavení ---
const template = fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8');
const html = renderPage(template, page, site);

const left = html.match(/<!--@\w+-->|\{\{\w+\}\}/g);
if (left) { console.error('Nenahrazeno:', left); process.exit(1); }

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
for (const dir of ['img', 'video', 'admin', 'fonts']) fs.cpSync(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
fs.copyFileSync(path.join(ROOT, '_headers'), path.join(DIST, '_headers'));
// verze CSS písem podle obsahu: po změně písma si prohlížeč stáhne nový soubor, ne starý z mezipaměti
const fontVer = (f) => require('crypto').createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'fonts', f))).digest('hex').slice(0, 8);
const versionFonts = (s) => s.replace(/href="\/fonts\/([\w-]+\.css)"/g, (m, f) => `href="/fonts/${f}?v=${fontVer(f)}"`);
fs.writeFileSync(path.join(DIST, 'index.html'), versionFonts(html));
fs.writeFileSync(path.join(DIST, 'admin', 'index.html'), versionFonts(fs.readFileSync(path.join(DIST, 'admin', 'index.html'), 'utf8')));
fs.writeFileSync(path.join(DIST, 'admin', 'historie.html'), versionFonts(fs.readFileSync(path.join(DIST, 'admin', 'historie.html'), 'utf8')));
fs.mkdirSync(path.join(DIST, 'ochrana-udaju'));
fs.writeFileSync(path.join(DIST, 'ochrana-udaju', 'index.html'), versionFonts(renderLegal(template, page, site, legal)));
for (const f of ['favicon.ico', 'apple-touch-icon.png']) fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
// pro vyhledávače: povolené procházení (kromě administrace) a mapa webu
// dočasná adresa na Netlify, po připojení domény změnit (viz README)
const SITE_URL = 'https://carwashiess.netlify.app';
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>
  <url><loc>${SITE_URL}/ochrana-udaju/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>
</urlset>
`);
// pro živý náhled v administraci: šablona, vykreslování a zveřejněný obsah
const PV = path.join(DIST, 'admin', 'preview');
fs.mkdirSync(PV, { recursive: true });
fs.writeFileSync(path.join(PV, 'template.html'), versionFonts(template));
fs.copyFileSync(path.join(ROOT, 'src', 'render.js'), path.join(PV, 'render.js'));
fs.copyFileSync(path.join(ROOT, 'content', 'page.json'), path.join(PV, 'page.json'));
fs.copyFileSync(path.join(ROOT, 'content', 'site.json'), path.join(PV, 'site.json'));
fs.copyFileSync(path.join(ROOT, 'content', 'legal.json'), path.join(PV, 'legal.json'));
console.log('Hotovo: dist/index.html (' + Math.round(html.length / 1024) + ' kB)');
