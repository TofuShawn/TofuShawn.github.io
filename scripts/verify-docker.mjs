#!/usr/bin/env node
/**
 * verify-docker.mjs — check the container, not the build.
 *
 * `npm run verify` proves the HTML is right. It cannot prove the *server* is
 * right, and the server is where the interesting failures live: a Location
 * header that drops the port, a missing CSP because of `add_header`
 * inheritance, a 404 that answers 200, an asset served with `no-cache`.
 *
 * So this script talks to a running container over HTTP and asserts the
 * behaviour a visitor would actually get. It needs nothing but Node.
 *
 *   node scripts/verify-docker.mjs [base-url]
 *   node scripts/verify-docker.mjs http://localhost:8080
 *
 * Exits 1 on the first hard failure; prints a table either way.
 */
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');

let failures = 0;
const rows = [];

function ok(name, detail) {
  rows.push({ pass: true, name, detail });
}
function bad(name, detail) {
  rows.push({ pass: false, name, detail });
  failures++;
}

async function head(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return res;
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  const body = await res.text();
  return { res, body };
}

async function main() {
  // --- routes -------------------------------------------------------------
  const routes = ['/', '/posts/', '/tags/', '/about/', '/posts/on-keeping-an-archive/', '/rss.xml', '/sitemap.xml'];
  for (const r of routes) {
    const res = await head(r);
    if (res.status === 200) ok(`GET ${r}`, '200');
    else bad(`GET ${r}`, `expected 200, got ${res.status}`);
  }

  // --- 404 ----------------------------------------------------------------
  {
    const { res, body } = await get('/definitely-not-a-page/');
    if (res.status !== 404) bad('404 status', `expected 404, got ${res.status}`);
    else ok('404 status', '404');
    if (!/Not found/i.test(body)) bad('404 body', 'did not serve the prerendered 404 page');
    else ok('404 body', 'prerendered page');
    // `add_header` is skipped on non-2xx/3xx unless it carries `always`, so the
    // error page can end up with no cache policy at all and be cached by a
    // proxy indefinitely.
    const cc = res.headers.get('cache-control') || '';
    if (/no-store/.test(cc)) ok('404 cache', cc);
    else bad('404 cache', `expected no-store, got "${cc}" — add_header needs "always"`);
  }

  // The 404 page must not be reachable directly with a 200 — `internal` in
  // nginx is what guarantees that, and it is easy to lose in a refactor.
  {
    const res = await head('/404.html');
    if (res.status === 404) ok('/404.html direct', '404 (internal)');
    else bad('/404.html direct', `expected 404, got ${res.status} — the internal directive is missing`);
  }

  // --- redirects must keep host:port --------------------------------------
  // nginx defaults to absolute redirects built from its listen port. Published
  // on 8080 that means `Location: http://host/posts/` — port dropped, visitor
  // sent to whatever runs on :80.
  for (const p of ['/posts', '/tags', '/about']) {
    const res = await head(p);
    const loc = res.headers.get('location') || '';
    if (res.status !== 301) bad(`redirect ${p}`, `expected 301, got ${res.status}`);
    else if (!loc.startsWith('/')) bad(`redirect ${p}`, `Location "${loc}" is absolute; absolute_redirect should be off`);
    else ok(`redirect ${p}`, `301 → ${loc}`);
  }

  // --- security headers on every kind of response -------------------------
  const asset = (await get('/')).body.match(/\/_astro\/[A-Za-z0-9._-]+\.css/)?.[0];
  const checks = [
    ['/', 'html'],
    ...(asset ? [[asset, 'asset']] : []),
  ];
  for (const [path, label] of checks) {
    const res = await head(path);
    const need = [
      ['content-security-policy', 'CSP'],
      ['x-content-type-options', 'nosniff'],
      ['x-frame-options', 'frame options'],
      ['referrer-policy', 'referrer policy'],
    ];
    const missing = need.filter(([h]) => !res.headers.get(h)).map(([, n]) => n);
    if (missing.length) bad(`headers ${label}`, 'missing: ' + missing.join(', '));
    else ok(`headers ${label}`, 'CSP + nosniff + frame + referrer');
  }

  // --- caching ------------------------------------------------------------
  if (asset) {
    const res = await head(asset);
    const cc = res.headers.get('cache-control') || '';
    if (/immutable/.test(cc) && /max-age=31536000/.test(cc)) ok('cache asset', cc);
    else bad('cache asset', `expected immutable 1y, got "${cc}"`);
    // Two max-age directives means `expires` and `add_header` are both emitting
    // a Cache-Control, and browsers disagree on which one wins.
    if (cc.split(',').filter((s) => /max-age/.test(s)).length > 1) {
      bad('cache asset single', `more than one max-age directive: "${cc}"`);
    }
  }
  {
    const res = await head('/');
    const cc = res.headers.get('cache-control') || '';
    if (/no-cache/.test(cc)) ok('cache html', cc);
    else bad('cache html', `expected no-cache, got "${cc}"`);
  }

  // --- compression --------------------------------------------------------
  {
    const res = await fetch(BASE + '/', { headers: { 'accept-encoding': 'gzip' } });
    const enc = res.headers.get('content-encoding');
    await res.arrayBuffer();
    if (enc === 'gzip') ok('gzip html', `content-encoding: gzip`);
    else bad('gzip html', `expected gzip, got "${enc}"`);
  }

  // --- the build that is actually inside the image ------------------------
  // A stale image is the failure mode nobody notices: `docker compose up`
  // without `--build` happily serves last week's site, and every check above
  // still passes because the *old* site is also correct. So assert on content
  // that only exists in the current skin build.
  {
    const { body } = await get('/tags/');
    const rows_ = (body.match(/class="tag"/g) || []).length;
    if (rows_ >= 5) ok('tags register markup', `${rows_} tag rows`);
    else bad('tags register markup', `expected the ruled register (>=5 rows), found ${rows_}`);

    if (/--tag-size/.test(body)) ok('tags sizing token', '--tag-size present');
    else bad('tags sizing token', 'per-chip --tag-size missing — page is from an older build');
  }
  {
    // The skin bundle is fingerprinted, so find it from the page rather than
    // guessing the name.
    const { body: html } = await get('/?skin=lone-trail');
    const m = html.match(/\/_astro\/[^"']+\.css/);
    if (!m) bad('skin bundle', 'no stylesheet link on the cover page');
    else {
      const res = await head(m[0]);
      if (res.status !== 200) bad('skin bundle', `${m[0]} → ${res.status}`);
      else {
        const css = await (await fetch(BASE + m[0])).text();
        // Both skins ship in one file, minified, and the minifier strips the
        // quotes from the attribute selector (`[data-skin=lone-trail]`) — so
        // match the *scoped* selector, quote-agnostic. Searching for a bare
        // `.rh{` finds Rhine's rule first and reports a false negative.
        const probes = [
          ['\\.rh', 'background', 'ink running head'],
          ['\\.tag', 'grid-template-columns', 'ruled tag register'],
          ['\\.punch', 'grid-template-columns', 'two-up punch card'],
          ['\\.tag:nth-child\\(odd\\)', 'background', 'zebra tag bands'],
        ];
        const missing = probes.filter(([sel, decl]) => {
          const re = new RegExp(`\\[data-skin=['"]?lone-trail['"]?\\]\\s*${sel}\\s*\\{`);
          const hit = re.exec(css);
          if (!hit) return true;
          const block = css.slice(hit.index, css.indexOf('}', hit.index));
          return !block.includes(decl);
        });
        if (missing.length === 0) ok('skin bundle current', `${probes.length} layout rules present`);
        else bad('skin bundle current', `missing: ${missing.map((p) => p[2]).join(', ')} — rebuild the image`);
      }
    }
  }

  // --- report -------------------------------------------------------------
  const w = Math.max(...rows.map((r) => r.name.length));
  for (const r of rows) {
    console.log(`${r.pass ? '✓' : '✗'} ${r.name.padEnd(w)}  ${r.detail}`);
  }
  console.log('');
  if (failures) {
    console.error(`✗ ${failures} check(s) failed against ${BASE}`);
    process.exit(1);
  }
  console.log(`✓ ${rows.length} checks passed against ${BASE}`);
}

main().catch((e) => {
  console.error(`could not reach ${BASE}: ${e.message}`);
  console.error('is the container up?  docker compose up -d');
  process.exit(1);
});
