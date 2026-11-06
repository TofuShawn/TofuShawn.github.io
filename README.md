# Archive — a multi-skin blog template

A personal blog template built on the idea that a website can behave like a
printed object: numbered spreads, crop marks, a registration target, a fold line,
a colophon. Two skins ship, and they are deliberately far apart.

- **Rhine Lab** — a bound dossier on a desk. Faithful port of
  [`Rad-Weed/rhine-lab-motion`](https://github.com/Rad-Weed/rhine-lab-motion) (MIT).
  Crop marks, fold line, binding holes, tape, stamp, redacted lines, halftone
  plates, a paper sound on every interaction.
- **Lone Trail** — a control room printed on paper. Ruled 12-column grid with no
  gutters, CRT scanlines (toneable, and switchable off with `S`), an 11s scan
  beam, a live ticker, a punch card you can type into, a morse lamp, De Stijl
  bars. Every page opens under a solid ink running head; `/tags/` is a ruled
  register rather than a cloud.

Same skeleton, same palette family, opposite medium. The point of shipping two is
that a skin system you have only ever tested with one skin is a skin system you
have not tested.

```
src/
  skins/
    contract.ts        the token list and feature flags every skin must satisfy
    registry.ts        filesystem discovery; throws on a broken skin
    rhine/             skin 1 (meta, tokens, chrome, behaviour)
    lone-trail/        skin 2
    _template/         copy-me starter; ignored by the registry
    .generated/        build output of scripts/scope-skins.mjs — do not edit
  lib/motion.ts        shared easing, scramble, odometer, reveal, DPR
  styles/base.css      structure only — no colours, no fonts, no literals
  layouts/BaseLayout   picks the skin, boots it before first paint
  pages/               cover, index, article, tags, colophon, 404, rss, sitemap
  content/posts/       Markdown
docker/
  nginx.conf           routing, caching, compression, 404
  security-headers.conf  the add_header set every location must include
Dockerfile             two-stage: node build → nginx serve
```

## Requirements

Node ≥ 22.23.4 (Astro 7 needs it), or Docker. No other services, no database,
no accounts.

```bash
npm install
npm run build     # scopes skins, then builds → dist/
npm run check     # skin contract + colour containment
npm run verify    # checks a clean dist/ (routes, furniture, metadata)
```

### Serving it

```bash
docker compose up --build     # http://localhost:8080  ← the intended path
npm run verify:docker         # asserts what the *server* actually returns
```

Two-stage image: `node:24-alpine` builds, `nginx:alpine` serves. 94MB, read-only
container, gzip on, immutable caching for `/_astro/*`, prerendered 404, relative
redirects.

`npm run verify` proves the HTML is right; it cannot prove the server is.
`npm run verify:docker` talks to the running container over HTTP and checks the
things a build cannot: redirect `Location` headers, the security headers on
every response type, `Cache-Control` on assets vs HTML, gzip, and that the 404
page is a real 404. Details and the three nginx traps worth knowing live in
[docker/README.md](docker/README.md).

Without Docker, `node scripts/serve.mjs` after a build serves `dist/` on :4399
for local viewing only.

> **Dev server caveat.** `astro dev` cannot start in every environment — it fails
> with `require is not defined` or `spawn EPERM` under some sandboxed hosts. This
> template was developed and verified against `astro build` plus a static file
> server, which is also what the image does. Nothing in the template depends on
> the dev server.

## Writing a post

```bash
npm run dev                                    # http://localhost:4321/ — edits appear live
npm run new -- --title "On paper"              # or just `npm run new` to be prompted
```

[WRITING.md](WRITING.md) is the specification: the two post shapes, the
frontmatter fields, the tag vocabulary, the code-prefix convention, and the
voice. Read it once; it is shorter than the number of decisions it settles.

`npm run new` writes `src/content/posts/<slug>.md` with the frontmatter and a
skeleton body. It warns about the things the layout cares about — an unquoted
title, a tag that is not in the vocabulary, a title long enough to wrap badly —
and refuses a title with no Latin characters unless you pass `--slug`, because
`論紙張` would percent-encode into an unreadable URL.

Frontmatter is validated with Zod at build time, so a typo fails the build with
the field name rather than rendering `undefined`:

```yaml
---
title: On keeping an archive
titleCn: 论保存一份档案        # optional, shown as a subtitle
description: One line for the index and the RSS feed.
date: 2026-02-14
updated: 2026-02-20           # optional
tags: [archives, writing]
featured: true                # optional, pins it on the cover
draft: false                  # optional, true hides it from every list
code: OA-0417                 # optional, else derived from the slug
---
```

Reading time and word count are computed from the body, counting Latin runs as
words and each CJK character as one word.

## Configuration

Everything site-specific is in `src/lib/site.ts`: title, subtitle, description,
author, canonical URL, locale, navigation, and the colophon text. Change
`site` in `astro.config.mjs` to match — RSS and canonical URLs read it.

## What ships

| Route | Page |
| --- | --- |
| `/` | Cover: masthead, title, metadata rows, barcode, index card |
| `/posts/` | Index, grouped by year |
| `/posts/<slug>/` | Article: running head, TOC, halftone plate, prev/next |
| `/tags/` | Flat tag list with counts |
| `/tags/<tag>/` | Entries carrying one tag |
| `/about/` | Colophon |
| `/404.html` | Not found |
| `/rss.xml` | Feed |
| `/sitemap.xml` | Sitemap |

## Skins

Two ship: `rhine` (default) and `lone-trail`. See [SKINS.md](SKINS.md) to add a
third, and [DESIGN.md](DESIGN.md) for the editorial system both are built on.

Skins are selectable at runtime with `?skin=<id>`, and the choice persists in
`localStorage`. Switching is an attribute change on `<html>` — the CSS is already
in the page and scoped by `[data-skin]`, so there is no reload and no flash.

Adding a skin means copying one folder. Two things make that work:

- `scripts/scope-skins.mjs` runs before every build and rewrites each skin's
  rules to `:root[data-skin='<id>'] …` before concatenating them into one bundle.
  You write plain CSS; the build guarantees it cannot leak.
- Pages emit the **union** of all skins' furniture, because the skin is not known
  at build time. Each skin's CSS hides what it does not want. See "feature flags
  are a superset" in SKINS.md before you turn a flag on.

## Accessibility notes

- Body text measures 5.09:1 (Rhine) and 12.84:1 (Lone Trail) against the sheet;
  ink is 16.49:1 and 17.05:1. Accent-coloured *text* uses `--accent-text`, a
  darkened variant that clears 4.5:1 in both skins — the raw accent is used only
  for rules, dots and fills, where the 3:1 graphic threshold applies.
- Lone Trail's De Stijl yellow (`#e3a724`, 1.86:1) never carries text; it exists
  as a stripe.
- `prefers-reduced-motion: reduce` skips the opening ceremony and every
  transition, renders halftone plates at their final state, and stops the scan
  beam and ticker.
- `?skip=1` bypasses the ceremony for screenshots and for anyone who wants in
  immediately.
- Lone Trail's CRT overlay is opt-out: the tab in the bottom-left corner, the
  `S` key, or `?fx=off`. The choice persists in `localStorage.fx` and is applied
  before first paint.
- Every interactive element is reachable by keyboard; the seal responds to
  `Enter`/`Space`, the grid overlay to `G`, and the CRT overlay to `S`. The
  punch-card input and the morse button are ordinary form controls.
- Sound is opt-in in Lone Trail (it starts muted) and absent from Rhine until a
  user gesture, because both browsers require one.

## Licence

The template is yours to fork. The Rhine skin is derived from
`Rad-Weed/rhine-lab-motion`, which is MIT — keep that attribution if you keep the
skin. Lone Trail is original to this template: its visual vocabulary was
reconstructed from a design-system reference page, not copied from game assets.
