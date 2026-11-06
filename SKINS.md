# Authoring a skin

A skin is a folder under `src/skins/`. Installing one is copying that folder —
there is no config file to edit and no registry to update, because the registry
reads the filesystem.

```bash
cp -r src/skins/_template src/skins/my-skin
```

Then change the id. Three files, in the order you should write them.

Two skins ship: **Rhine Lab** (a printed dossier) and **Lone Trail** (a CRT
console). They are deliberately far apart — same Swiss skeleton, opposite medium
— because that is the only honest test of whether the seam works. Read whichever
one is closer to what you want and steal from it.

## 1. `meta.ts` — identity and feature flags

```ts
import type { SkinMeta } from '../contract';

const meta: SkinMeta = {
  id: 'my-skin',                 // MUST equal the folder name
  name: 'My Skin',               // shown in the switcher
  tagline: 'One line under it',
  scheme: 'light',               // or 'dark'; sets color-scheme
  themeColor: '#f6f3eb',         // browser chrome
  swatch: '#e9521c',             // switcher dot; cosmetic only
  features: {
    unseal: false,
    halftone: false,
    scanline: false,
    gridOverlay: false,
    hud: false,
    printArtifacts: false,
    barcode: false,
    columnRules: false,
    crt: false,
    marquee: false,
    destijl: false,
    punchcard: false,
    morse: false,
  },
};

export default meta;
```

The id/folder mismatch check exists because the id selects the skin
(`[data-skin="my-skin"]`) while the folder is how `skin.css` and `Chrome.astro`
are located. Letting them diverge produces a skin that loads its CSS but never
matches its own selector — a confusing, silent failure. The registry throws
instead, at build time, naming both values.

### Feature flags are a superset, not a switch

This is the part that surprises people. The build cannot know which skin a
visitor will be wearing, because switching happens in the browser. So **every
page emits the union of all skins' furniture**, and CSS decides what is visible.

Two consequences:

- Setting a flag to `true` does not emit anything by itself; it tells the layout
  "a skin in this site needs this element". The layout emits it once.
- **Your skin must hide what it does not want.** `featuresOf(id)` gates what the
  layout *renders*; your `skin.css` gates what is *seen*. If another skin turns
  on `crt` and yours does not style `.crt-scanlines`, your skin gets scanlines
  over it. Every skin therefore carries a block like:

  ```css
  .hud, .unseal, .cropmarks, .fold, .binding,
  .sticker, .tape, .stamp, .redact, .footnote, .figcap, .barcode { display: none; }
  ```

  Lone Trail's is at the bottom of `src/skins/lone-trail/skin.css`; Rhine's is
  the mirror image, hiding the console furniture.

The rule of thumb: a flag is a promise that your skin has styles for those
elements *either way* — shown or hidden.

## 2. `skin.css` — tokens, then structure

`npm run check` fails unless every token in `contract.ts` is defined for
`:root[data-skin='<id>']`. That is deliberate: a missing token does not fall back
to a sensible default, it falls back to *nothing*, and the layout silently
collapses. The check turns a visual bug into a build error.

The two tokens people get wrong:

- **`--accent-text`** — the accent hue darkened until it clears 4.5:1 on
  `--bg-sheet`. Use it for accent-coloured text at 8–13px. The raw `--accent` is
  for rules, dots, borders and fills, where 3:1 is the threshold. If you skip this
  and use `--accent` for small text, the page will look right and fail contrast.
  Rhine: `#e9521c` → `#bf3d0d`. Lone Trail: `#e9521c` → `#a8380a`.
- **`--font-mono`** — every numeral in the design is monospaced and
  `tabular-nums`, because the odometer animates digit by digit and columns have to
  align. A proportional mono stack makes numbers jitter mid-animation.

### Write rules unscoped — the build scopes them

```css
.spread { border: 2px solid var(--rule); }
```

`npm run build` runs `scripts/scope-skins.mjs` before Astro, and that script
rewrites every rule in every skin file to
`:root[data-skin='<id>'] .spread { … }`, then concatenates them all into one
bundle. The token block is the exception: it is already scoped, and the scoper
leaves `:root[data-skin=…]` selectors alone.

This is automated because getting it wrong is silent and expensive. Both skins'
stylesheets ship in one file; an unscoped `.masthead { background: red }` in your
skin repaints the masthead of *every* skin on the site, for every visitor, with
no error. The scoper exists so that cannot happen. (It was found the hard way —
see `DESIGN.md`.)

At-rules are handled: `@media` and `@supports` blocks are recursed into and their
inner rules scoped; `@font-face`, `@keyframes`, `@property` and friends pass
through untouched.

### Selectors that start with `html` or `:root`

A rule whose subject is the root element needs the scope spliced into it, not
prefixed onto it:

```css
html.fx-off .crt-scanlines { display: none; }
```

The scoper turns that into `:root[data-skin='x'].fx-off .crt-scanlines`, not
`:root[data-skin='x'] .fx-off …`. The difference matters: the second form means
"an `.fx-off` **descendant** of the root", and since state classes like
`fx-off`, `no-seal` and `lt-still` are set on `<html>` itself, it would never
match. Write `html.` or `:root` when you mean the document element and the
build will do the right thing; write a bare class when you mean a descendant.

That failure is silent — the class is applied, the rule exists, nothing matches
— so if a state class "does nothing", check this first.

### Put media queries at the bottom of the file

Every rule is scoped to the same specificity, so **source order alone decides
which wins** — there is no "media query beats base rule" rule in CSS. A
`@media (max-width: 760px)` block written up with the other breakpoints, above
the base rule it is meant to override, loses to that base rule.

This shipped as a real bug: the punch card's 760px layout was written near the
top of `skin.css`, and at 390px the bit matrix kept `grid-column: 2` and measured
**16px wide** — a valid rule, in the stylesheet, outranked by the base rule 900
lines further down. Moving the block to the end of the file made it 289px.

Two consequences for skin authors:

- **Breakpoints go last.** All of them, after everything they override.
- **Inside a media block, later also wins**, so order within the block matters
  the same way.

A related trap in the same code: `grid-auto-columns: 1fr` means
`minmax(auto, 1fr)`, so columns never shrink below min-content and ten of them
overflow a 390px card. Use `minmax(0, 1fr)` when you want them to share the space
that exists.

## 3. `Chrome.astro` — optional furniture

The seal, the coordinate HUD, the grid overlay. This component is only mounted if
the folder contains it, and each block inside is gated on its own flag:

```astro
---
import { featuresOf } from '../registry';
const f = featuresOf('my-skin');
---
{f.hud && <div class="hud">…</div>}
```

If your skin needs behaviour, add a `client.ts` and import it from
`Chrome.astro` with `<script>import './client';</script>`. It is bundled per skin.
Shared animation helpers (`scramble`, `ode`, `onEnter`, `enableMotion`,
`reduceMotion`, `dpr`, easing) live in `src/lib/motion.ts` — import them rather
than copying, so a skin stays deletable without breaking another.

Three rules for skin scripts:

- **Never run before first paint.** Set state from the inline boot script in
  `BaseLayout.astro` (which already handles `?skin=` and `?skip=1`) or accept a
  flash.
- **Guard on your own skin.** Both skins' bundles load on every page. Start
  `boot()` with `if (document.documentElement.dataset.skin !== 'my-skin') return;`
  or two skins' scripts will fight over the same elements.
- **Always have an escape hatch.** Every overlay that locks scrolling must be
  able to unlock itself without JS. Rhine's seal and Lone Trail's launch both
  force-release after 8 seconds if their script never runs.

## Duplicate ids are fine — shared markup is not

Element ids are the one place the superset bites. If two skins each want an
`#unseal` overlay, the document ends up with two elements carrying that id and
`getElementById` returns whichever came first. Namespace per-skin furniture:
Rhine's overlay is `#unseal`, Lone Trail's is `#lt-launch`.

## Anything the layout renders for you, you must style

Two shared pieces of markup are style-free on purpose, so a skin can dress them:

- `.skin-switch .sw` — the colour chip in the switcher. It is an empty span whose
  *only* styling is its size; a skin that forgets the rule renders nothing.
- `.skin-switch .cur` — the "active" marker. It is emitted for **every** entry and
  hidden by `base.css` via `[aria-pressed='false']`, because the build always
  thinks the default skin is active while `?skin=` and `localStorage` can
  override that before first paint. Do not hide it by comparing ids at build
  time; you will ship a marker on the wrong row.

## Ambient effects are the visitor's call

If your skin paints something *over* the content — a texture, a grain, a
scanline, a vignette — ship a way to turn it off. Lone Trail's CRT layer is
opt-out three ways: a 20px tab in the bottom-left corner, the `S` key, and
`?fx=off`. The state is `html.fx-off`; the shell reads `localStorage.fx` in its
pre-paint script and applies the class, so there is no flash, and the skin only
has to style it:

```css
html.fx-off .crt-scanlines,
html.fx-off .crt-beam { display: none; }
```

Do not fade the control to make it discreet. Opacity is not quietness — it is
invisibility plus a WCAG 1.4.11 failure. Use size and the absence of a label.

## What the contract does not cover

The token list is the minimum, not the whole design. A skin may add its own
tokens in the same block; the checker only verifies that the required ones exist.
Lone Trail adds `--ds-red`, `--ds-blue`, `--ds-yellow` and `--scanline` this way.
If you find yourself needing a *new shared* token, add it to `REQUIRED_TOKENS`
and to every skin — that is a breaking change to the contract, and the check will
tell you exactly which skins are behind.

## Checklist

- [ ] Folder name equals `meta.id`
- [ ] `npm run check` passes (tokens complete, no colour literals outside `src/skins/`)
- [ ] `--accent-text` clears 4.5:1 on `--bg-sheet` — measure it, do not eyeball it
- [ ] Rules are written unscoped (the build adds the scope), except the token block
- [ ] Every element another skin's flags turn on is either styled or hidden here
- [ ] Per-skin element ids are namespaced
- [ ] `boot()` early-returns unless `data-skin` matches
- [ ] Every feature flag is either `false` or backed by real DOM and CSS
- [ ] `prefers-reduced-motion` renders a complete page with no animation
- [ ] The page scrolls at 390px and at 1440px with no horizontal overflow
- [ ] Switching skins with `?skin=` changes every visual token, not just some
- [ ] `?skip=1` hides your ceremony at first paint (`data-ceremony` is enough)
- [ ] Anything painted over the text has an off switch, and the switch is
      legible at rest (3:1, not `opacity:.3`)
- [ ] State classes on `<html>` are written with an `html.` prefix in CSS
- [ ] All `@media` blocks sit at the end of `skin.css`, after what they override
- [ ] The sheet is occupied: no 300px+ run of bare paper in any viewport
      (`scripts/deadprobe.html` finds them)
