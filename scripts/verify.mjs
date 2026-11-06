#!/usr/bin/env node
/**
 * Portable verification: everything that can be checked without a browser.
 *
 *  1. The skin contract and colour containment (`check.mjs`).
 *  2. Every route in the built site serves a real HTML document.
 *  3. The document carries the furniture its skin advertises.
 *
 * This is the check that runs in CI. The pixel-level harness (screenshots,
 * contrast measurement, overflow walk) lives in `scripts/probe.html` and needs a
 * real browser; see the README for how to run it. Keeping the two separate means
 * `npm run verify` is fast and environment-independent, while the visual checks
 * stay available when you are changing the design.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runChecks } from './check.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/* ---------------------------------------------------------------- routes -- */

/** Every route the template is expected to emit. */
const ROUTES = [
  '/',
  '/posts/',
  '/tags/',
  '/about/',
  '/404.html',
  '/rss.xml',
  '/sitemap.xml',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (p.endsWith('/')) p += 'index.html';
        const file = normalize(join(DIST, p));
        if (!file.startsWith(DIST)) {
          res.writeHead(403).end('forbidden');
          return;
        }
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

/* ------------------------------------------------------------------ run -- */

const errors = [];
const notes = [];

// 1. Contract + colour containment, in-process — a sandboxed host may refuse
//    child_process.spawn, so shelling out to check.mjs is not portable.
try {
  const { errors: checkErrors, notes: checkNotes } = await runChecks();
  notes.push(...checkNotes);
  errors.push(...checkErrors);
  if (!checkErrors.length) notes.push('skin contract ok');
} catch (e) {
  errors.push('check.mjs threw: ' + e.message);
}

// 2. Routes.
try {
  await stat(join(DIST, 'index.html'));
} catch {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(2);
}

const server = await serve();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const pages = new Map();

try {
  for (const route of ROUTES) {
    const res = await fetch(base + route);
    const body = await res.text();
    if (!res.ok) {
      errors.push(`${route} → HTTP ${res.status}`);
      continue;
    }
    if (body.length < 200) {
      errors.push(`${route} → suspiciously short body (${body.length} bytes)`);
      continue;
    }
    pages.set(route, body);
    notes.push(`${route} ok (${body.length} bytes)`);
  }

  /* ------------------------------------------------- furniture assertions -- */

  const home = pages.get('/') ?? '';

  // The cover must carry its masthead and a title.
  if (!/<h1[^>]*class="[^"]*t-cover/.test(home)) {
    errors.push('/: no .t-cover h1 — the cover has no title');
  }
  if (!/class="[^"]*masthead/.test(home)) errors.push('/: no .masthead');

  // Print artifacts are feature-gated; if the flag is on, the DOM must be there.
  const artifacts = [
    ['.cropmarks', /class="[^"]*cropmarks/],
    ['.reg', /class="[^"]*reg"/],
    ['.colorbar', /class="[^"]*colorbar/],
    ['.folio', /class="[^"]*folio/],
    ['.fold', /class="[^"]*fold"/],
  ];
  for (const [name, re] of artifacts) {
    if (!re.test(home)) errors.push(`/: ${name} missing though printArtifacts is on`);
  }

  // The barcode canvas must carry explicit width/height or it renders at zero.
  const bc = home.match(/<canvas[^>]*data-barcode[^>]*>/);
  if (bc) {
    if (!/\bwidth="\d+"/.test(bc[0]) || !/\bheight="\d+"/.test(bc[0])) {
      errors.push('/: barcode canvas lacks explicit width/height attributes');
    }
  } else {
    errors.push('/: barcode canvas missing though barcode is on');
  }

  // The seal must be present on the cover and absent elsewhere.
  if (!/id="unseal"/.test(home)) errors.push('/: no #unseal overlay though unseal is on');
  for (const [route, body] of pages) {
    if (route !== '/' && /id="unseal"/.test(body)) {
      errors.push(`${route}: #unseal leaked onto a non-cover page`);
    }
  }

  // Every page must have exactly one h1 and a skip link.
  for (const [route, body] of pages) {
    if (!/\.html$/.test(route) && !/\.xml$/.test(route)) {
      const h1 = (body.match(/<h1[\s>]/g) ?? []).length;
      if (h1 !== 1) errors.push(`${route}: expected exactly one <h1>, found ${h1}`);
      if (!/class="skip-link"/.test(body)) errors.push(`${route}: no skip link`);
    }
  }

  // Markdown must actually have been rendered, not left as raw text.
  const article = [...pages.entries()].find(([r]) => /^\/posts\/[^/]+\/$/.test(r));
  if (article) {
    const [route, body] = article;
    if (body.includes('---\ntitle:')) errors.push(`${route}: frontmatter leaked into the output`);
    if (!/<h2[\s>]/.test(body)) errors.push(`${route}: no rendered <h2> — headings missing`);
  }

  // RSS must be valid-ish XML with at least one item.
  const rss = pages.get('/rss.xml') ?? '';
  if (rss && !/<rss[\s>]/.test(rss)) errors.push('/rss.xml: not an RSS document');
  if (rss && !/<item>/.test(rss)) errors.push('/rss.xml: no <item> entries');

  // Sitemap must list URLs.
  const sm = pages.get('/sitemap.xml') ?? '';
  if (sm && (sm.match(/<url>/g) ?? []).length < 3) {
    errors.push('/sitemap.xml: fewer than 3 <url> entries');
  }
} finally {
  server.close();
}

/* ------------------------------------------------------------ reporting -- */

for (const n of notes) console.log(`  ${n}`);

if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(`\n✓ ${ROUTES.length} routes verified, furniture and metadata intact.`);
