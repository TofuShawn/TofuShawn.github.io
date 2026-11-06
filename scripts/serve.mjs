// Minimal static server for previewing the built site.
// Astro's own `dev`/`preview` servers cannot start in this sandbox, so this
// stands in for them: `node scripts/serve.mjs [dir] [port]`.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const port = Number(process.argv[3] ?? 4399);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

async function resolve(urlPath) {
  // Strip query/hash, decode, and refuse anything that escapes `dir`.
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = normalize(clean).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const base = join(dir, rel);
  if (!base.startsWith(dir)) return null;

  for (const candidate of [base, join(base, 'index.html'), `${base}.html`]) {
    try {
      const s = await stat(candidate);
      if (s.isFile()) return candidate;
    } catch {
      /* try the next shape */
    }
  }
  return null;
}

createServer(async (req, res) => {
  const file = await resolve(req.url ?? '/');
  if (!file) {
    const notFound = await resolve('/404.html');
    res.writeHead(404, { 'content-type': MIME['.html'] });
    res.end(notFound ? await readFile(notFound) : 'Not found');
    return;
  }
  const body = await readFile(file);
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  res.end(body);
}).listen(port, '127.0.0.1', () => {
  console.log(`serving ${dir} at http://127.0.0.1:${port}`);
});
