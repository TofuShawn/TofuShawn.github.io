# Serving the site

Two ways to run this, and they are not equivalent. Read the second section
before you decide.

## 1. Docker (what you want in production)

```bash
docker compose up -d --build --force-recreate   # http://localhost:8080
docker compose down                             # stop and remove
npm run verify:docker                           # assert what the server actually returns
npm run test:verify                             # prove the assertions can still fail
```

**`--force-recreate` is not optional either.** `docker compose up` alone reuses
the existing container; `up --build` alone can still reuse it, because Compose
decides by service config rather than image contents. Either way a source change
can be invisible and every HTTP check still passes. See the last section.

The image is a two-stage build: `node:24-alpine` runs `npm run build` (which
includes `scripts/scope-skins.mjs`), then the `dist/` folder is copied into
`nginx:alpine`. Nothing from the build stage survives — no Node, no
`node_modules`, no source. Final image: **94MB**, of which most is nginx and
the Alpine base.

What the config does, and why:

| Concern | Choice | Reason |
| --- | --- | --- |
| Serving | nginx, `try_files $uri $uri/ $uri/index.html` | `build.format: 'directory'` makes every route a folder |
| 404 | `error_page 404 /404.html` + `internal` | the prerendered page, but not reachable directly with a 200 |
| Fingerprinted assets | `Cache-Control: public, max-age=31536000, immutable` | `/_astro/*` names change with content |
| HTML | `Cache-Control: no-cache` | otherwise a deploy is invisible to returning visitors |
| Redirects | `absolute_redirect off` | see below — this one is a real trap |
| Compression | gzip level 6, all text types | 17.4KB HTML → 5.9KB |
| Container | `read_only`, `no-new-privileges`, tmpfs for cache/run | nginx only reads; nothing needs to write |

### The redirect trap

nginx builds redirect `Location` headers from its own `listen` port. The
container listens on 80 but is published on 8080, so `GET /posts` answered:

```
301  Location: http://127.0.0.1/posts/     ← port silently dropped
```

A visitor would have been sent to whatever else runs on port 80. `absolute_redirect
off` makes the header relative (`/posts/`), which preserves the real host:port.
Verified: `/posts`, `/tags`, `/about`, `/tags/notes` all now redirect to
`:8080`.

### The `add_header` inheritance trap

nginx inherits `add_header` from an enclosing block **only if the inner block
declares none of its own**. The first version had the security headers at
`server` level and `add_header Cache-Control` inside `location /` — and the
container served every page with **no CSP, no nosniff, no X-Frame-Options**,
while the config file looked correct. That is why the shared set lives in
`docker/security-headers.conf` and is `include`d in every block that adds a
header of its own.

Verified present on `/`, on `/_astro/*.css`, and on the 404 page.
### One header, not two

`expires 1y` emits its own `Cache-Control`, which then competes with a manual
`add_header Cache-Control`. Two Cache-Control headers in one response is legal
and browsers pick differently. Use `add_header` alone.

### `add_header` is skipped on errors unless you say `always`

The same directive has a second trap, in the opposite direction: by default it
only applies to `2xx` and `3xx` responses. The 404 block declares its own
`add_header Cache-Control "no-store"` — and since that block only ever produces
404s, the header never applied at all. The error page shipped with **no cache
policy**, which lets a proxy or a CDN cache a 404 indefinitely and keep serving
it after the page exists. `no-store` + `always` fixed it; the shared
security-header snippet already carried `always`, which is why only this one
went missing.

`npm run verify:docker` now asserts both, so a refactor that drops either fails
loudly instead of silently.

### The stale image, which no header check can catch

The nastiest container failure is not a broken config — it is a **correct config
serving last week's site**. `docker compose up` without `--build` reuses the
existing image, and every status-code, header and cache assertion still passes,
because the old site was also fine. It is only wrong in content.

So the suite also asserts on the build that is actually inside the image:

| Check | What it proves |
| --- | --- |
| `tags register markup` | `/tags/` contains ≥5 `class="tag"` rows |
| `tags sizing token` | the page emits `--tag-size` (absent before the register) |
| `skin bundle current` | the served `/_astro/*.css` contains four Lone Trail layout rules, matched **scoped** |

The last one has a trap of its own, and I walked into it twice:

1. Both skins ship in one stylesheet, so searching for a bare `.rh{` finds
   Rhine's rule and reports a false negative. Match
   `[data-skin=lone-trail] .rh{`.
2. **The minifier strips the quotes from the attribute selector.** The source
   says `[data-skin='lone-trail']`; the served bytes say
   `[data-skin=lone-trail]`. A quoted indexOf match therefore never fires, and
   the check reports every rule missing. Match quote-agnostically.

A check that cannot fail is worse than no check, so `npm run test:verify` proves
the probe both ways: it must **pass** on the current bundle and **catch all four
rules** in a reconstruction of the pre-fix bundle. Run it after touching the
probe; a silent false negative is exactly the bug it exists to prevent.

### `up --build` can still leave you on the old image

Measured on this machine, and it is not obvious from the output:

```
$ docker compose up -d --build
 Image archive-blog:local Built
 Container archive-blog Running        ← not "Recreated"

$ docker inspect archive-blog --format '{{.Image}}'
sha256:e74b9a…                          ← the container's image
$ docker image inspect archive-blog:local --format '{{.Id}}'
sha256:d0bade…                          ← the tag, moved on without it
```

Compose decides whether to recreate a container by comparing the **service
config**, not the image contents. If only the source changed, the config is
identical, the container is left alone, and the freshly built image sits unused
under the tag. The container then serves the previous build indefinitely.

Two ways out, and you want one of them every time:

```bash
docker compose up -d --build --force-recreate
docker compose down && docker compose up -d --build
```

In this particular run the two images happened to contain byte-identical HTML
(the source change was `.dockerignore` only), so nothing was visibly wrong — but
that is luck, not a guarantee. **Content assertions cannot save you here**: if
the stale image's content is correct, every check passes. Force the recreate.

Verify it took, if you want to be sure:

```bash
docker inspect archive-blog --format '{{.Image}}'
docker image inspect archive-blog:local --format '{{.Id}}'
# these must be equal
```

## 2. Without Docker

```bash
npm install
npm run build
node scripts/serve.mjs        # http://localhost:4399
```

`scripts/serve.mjs` is a 60-line static server for local use. It does not do
compression, caching headers, or 404 handling the way the nginx config does —
use it for looking at the site, not for serving it to anyone else.

## The dev server caveat

`npm run dev` does not work in every environment. On this machine Astro's dev
server fails with `require is not defined` (Astro 7) or
`spawn EPERM at optimizeSafeRealPathSync` (Astro 6/5), because the sandbox
refuses the process spawns Vite needs. The same applies to `astro preview`.

This does **not** affect the container: the image only runs `astro build`, which
works. If `npm run dev` fails for you, use `npm run build && node scripts/serve.mjs`
and reload after each change.
