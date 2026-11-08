# The editorial system

Notes on the design these skins implement, and on which of their rules are
load-bearing rather than decorative. Read this before changing a skin; most of
these constraints are invisible until you break them.

Two skins ship. **Press** is a press proof on the bed. **Lone Trail** is a
control room printed on paper. They share one skeleton and one palette family,
and differ in medium — which turns out to be the only variable that matters.

## The two skins

|  | Press | Lone Trail |
| --- | --- | --- |
| Fiction | a bound, trimmed, stamped archive | a CRT console, still on paper |
| Columns separated by | whitespace (20px gutter) | rules (0 gutter, 1px hairlines) |
| Measure | 1180px, 56px margins | 1280px, no margins (full bleed) |
| Case | sentence case | uppercase throughout |
| Frame | none; crop marks imply the trim | hard 2px border on every panel |
| Furniture | crop marks, fold, binding, tape, stamp, redact | scanlines, ticker, punch card, morse, De Stijl bars |
| Motion | slow, papery, 720ms entrances | faster, mechanical, 620ms; an 11s scan beam |
| Accent share | 0.00% of cover pixels | 0.03% of cover pixels |
| Pixels that are not bare paper, cover sheet | 12.2% | 32.2% |

The shared part is Swiss/International Typographic Style: a 12-column grid, warm
off-white paper, near-black ink, exactly one saturated accent, monospaced
uppercase micro-labels with heavy tracking, and exposed hairlines instead of
shadows. Both are micro-first — the most common type size on either page is
10–12px, not 16px.

The accent is `#e9521c` in both. That is a deliberate refusal: the second skin
was derived from a video reference whose orange samples at `#E85D2A`, which is
ΔE76 6.65 away — but most of that gap is 4:2:0 chroma subsampling, not a design
decision. A source-level token beats a video sample. Same hue, so the two skins
are recognisably one family.

## Tokens

Press (`src/skins/press/skin.css`):

```
paper    #e4e0d5   the desk, outside the sheet
sheet    #f6f3eb   the page itself
sheet-2  #efece2   a section of paper laid on the page
ink      #151513
ink-2    #3c3c36   body copy
mute     #6a675f   captions, metadata
hair     rgba(21,21,19,.20)
hair-2   rgba(21,21,19,.10)
accent   #e9521c   vermilion — the one saturated colour
lime     #b9e432   reserved for the poster spread
```

Lone Trail (`src/skins/lone-trail/skin.css`) shifts the neutrals slightly cooler
and whiter — `#e7e2d8 / #faf8f5 / #f2efe9`, ink `#161618` — and adds the De Stijl
primaries as skin-local tokens: `--ds-red #d6382b`, `--ds-blue #1d569e`,
`--ds-yellow #e3a724`. Yellow is 1.86:1 on the sheet and must never carry text;
it exists to be a stripe.

One accent per skin, used sparingly: rules, dots, folio marks, the active state.
Accent is **never** a large fill. The measured accent share of the Press cover is
0.00% of pixels at 1440 (0.01% at 390) — the marks are few enough and small
enough to fall below a tenth of a percent, which is exactly what makes the accent
read as a mark rather than a colour scheme. Lone Trail measures 0.03%, and that
difference is the whole temperament gap between the two skins.

`--accent-text` exists because the raw accent cannot carry small text: `#e9521c`
is 3.33:1 on Press's sheet and 3.22:1 on Lone Trail's. Each skin darkens it —
`#bf3d0d` (4.87:1) and `#a8380a` (5.66:1) — and uses that for any text in the
accent hue. The raw accent stays for graphics, where 3:1 is the threshold.

## Grid

Press: 1180px measure, 56px margins, 12 columns, 20px gutter.

```
(1180 − 2×56 − 11×20) / 12 = 70.666…px per column
pitch                       = 90.666…px
```

Measured in Chromium at a 1440px viewport: **70.5px**, because the sheet is
`min(1180px, 100% − 32px)` and the viewport rounding lands a hair under. The
theory and the measurement agree to within a subpixel; what matters is that the
columns stay equal, which the `1fr` grid guarantees.

Lone Trail: 1280px, no margins, **zero gutter** — twelve tracks of 99.66px at
1440, 78.33px at 1024. The columns are separated by a `border-left` on every
child and a `border-top` on the row, so the grid reads as a ruled table rather
than a set of text columns. This is the single structural difference between the
skins, and it is expressed entirely in `.g` / `.g > *` in each `skin.css`.

Vertical rhythm is a multiple of 8px in both. Note that body copy is
`13px / 1.98 = 25.74px`, which is *not* 24px — the reference documentation claims
24px, the CSS says otherwise. Treat 8px as a spacing grid rather than a strict
baseline; do not "correct" the line height to hit 24px, because the reference's
own type ramp does not.

`.g > * { min-width: 0 }` is load-bearing. Without it, an unbreakable string — a
long serial number, a URL — blows out its `1fr` track and pushes the grid wider
than the page. This is the single most common way the layout breaks. Note it is
guaranteed only for `.g > *`; the cover's own two-column grid needed it applied
by hand, which is how a 390px overflow got through review once.

## Type

| Class | Role | Size / leading |
| --- | --- | --- |
| `.t-cover` | the title | `clamp(58px, 10.4vw, 148px)` / 0.90, −.035em |
| `.t-display` | section head | `clamp(38px, 5.2vw, 62px)` / 1.02 |
| `.t-h1` | article title | 27px / 1.25 |
| `.t-h2` | subhead | 17px / 1.55 |
| `.t-lead` | standfirst | 14.5px / 2 |
| `.t-body` | body copy | 13px / 1.98, +.02em |
| `.t-cap` | caption | 10px mono, +.16em, caps |
| `.t-micro` | metadata | 8.5px mono, +.24em, caps |
| `.t-num` | a statistic | `clamp(46px, 7vw, 92px)`, tabular |
| `.t-outline` | a huge ghost numeral | `clamp(90px, 17vw, 220px)` / 0.82, stroked |

The ramp is unusually small for body copy — 13px. That is the reference's
decision and it is what makes the page read as a printed sheet rather than a
webpage. If you raise it, raise `--lh-body` with it or the measure gets too long.

The display face is the loudest single difference between the skins: Press uses
Helvetica Neue (Swiss, neutral, 1960s), Lone Trail uses Jost (a Futura revival —
geometric, 1920s, and the face the reference page was reaching for). Both stack a
CJK face behind it and both use a mono for every number.

Every numeral is `font-variant-numeric: tabular-nums`. The odometer animates one
digit at a time; with proportional figures the text shifts horizontally on every
frame.

## Print artifacts

Thirteen devices in Press, each with a job:

| Artifact | Job |
| --- | --- |
| Crop marks | says "this is a trimmed sheet" |
| Registration target | says "this was printed in register" |
| Colour bar | says "five inks", and gives the eye a colour reference |
| Fold line | divides the sheet, with a vertical label |
| Binding holes | says "this was bound" |
| Sticker | a correction applied after printing; must overhang the edge |
| Tape | holds something down; torn edge, never straight |
| Stamp | an approval; rotated, multiplied into the paper |
| Redact bar | withholds; reveals on hover |
| Sidenote | a margin aside, ruled off |
| Footnote | a numbered aside at the foot |
| Figcap | `FIG.02` in accent, before the caption |
| Revision marks | shows the sheet was revised |

These are not decoration. Each one is a claim about the object — that it was
printed, trimmed, bound, corrected, approved, revised. Remove them and the page
becomes a webpage with a beige background; the whole effect depends on the
fiction being consistent.

Two rules that are easy to get wrong:

- **A sticker or tape must overhang.** A sticker fully inside the sheet reads as a
  card, not as something stuck on. The cover sticker hangs 23px past the right
  edge. It must not, however, overlap body text — verify that, do not assume it.
- **A stamp multiplies.** `mix-blend-mode: multiply` makes the ink soak into the
  paper. On the dark poster spread it flips to `screen`, or it disappears.

Lone Trail has no print artifacts at all — a console is not trimmed or bound —
and instead carries a scanline overlay, a ticker, a punch card and a morse lamp.
The two sets are mutually hidden: each skin's stylesheet ends with a rule that
sets the other's furniture to `display: none`. Both sets ship in every page,
because the skin is chosen at runtime.

### The scanline has to stay under the text

An overlay that sits on top of every glyph is judged by the text, not by itself.
The first version was `rgba(22,22,24,.055)` on a 4px pitch at `opacity:.9` —
an effective 1px row of ~5% ink every 4px, and it made 13.5px body copy shimmer.
The shipped value is `rgba(22,22,24,.03)` on a **5px** pitch at `opacity:.9`,
i.e. ~2.7% ink per dark row: alpha down 45%, coverage down 25% (1 row in 4 → 1
in 5), **2.3× less ink on the page** in total. Measured on the rendered PNG
(1440×1500, flat margin strip x 1330–1410, y 200–900): dark rows sit at `221.3`
against a `227.5` ground — a 6.2/255 dip, with a clean 5px autocorrelation of
`0.999` at lag 5 and `−0.25` at lag 4 and 6, which is the pitch landing exactly
where it should.

Two consequences worth keeping:

- The beam was 2px at `opacity:.4` every 7s with a 12px glow. It is now 1px at
  `.22` every 11s with an 8px half-strength glow. A sweep that returns faster
  than the eye forgets it is a flicker, not an atmosphere.
- Anything at this density must be **optional**. The skin ships a 20px tab
  flush in the bottom-left corner (`#fxtoggle`, `S` key, `?fx=off`), and the
  preference is read pre-paint from `localStorage.fx` so it never flashes on.
  The flag is `html.fx-off`, applied by the shell, styled by the skin — the
  same split as `no-seal`.
- The tab is quiet because it is small and unlabelled, **not** because it is
  translucent. `opacity:.3` measured 1.58:1 against the sheet, well under the
  3:1 WCAG 1.4.11 floor for a control boundary; at full opacity the glyph is
  6.71:1 and the border 17.05:1. Fading a control to make it discreet is how
  you make it undiscoverable.

## Halftone

Press draws figures as halftone dots on canvas, not as images:

```
r = min(cell × 0.63, √density × cell × (isAccent ? 0.34 : 0.63))
```

with dots skipped below `density ≤ 0.03`, jittered by `±0.16 × cell` to break the
moiré a perfectly regular screen produces, and roughly 0.6% of dots in accent
(`hash(cx×3.1 + ry×5.7) > 0.994`). Ink `#151513` on a `#efece2` flood. The plate
develops row by row over 780ms.

Lone Trail replaces it with a scanline sphere: a circle of radius
`min(w,h) × 0.25`, a dashed ring at 1.45×, fourteen horizontal scanlines whose
weight rises `0.8 + pow(ny, 1.5) × 5.2` from top to bottom, an accent band where
`ny` falls in (0.58, 0.75), a tilted ellipse `1.85r × 0.52r` at −24° carrying a
satellite, and a counter-rotating polar ring. It is deliberately lower-contrast
than the halftone (measured ink coverage 0.058 vs 0.311) because it sits on a
whiter sheet.

Two implementation constraints:

- **The lock must be set after the draw, not before.** If `dataset.drawn = '1'` is
  set up front and the animation frame never runs — a background tab, a throttled
  iframe — the plate stays transparent forever. Set the lock in a `finish()` that
  both the animation and a `setTimeout` fallback can reach.
- **DPR is capped at 2.** Beyond that the canvas costs memory for no visible gain.

Both painters pause via `IntersectionObserver` when off-screen. A canvas loop
that keeps running below the fold is the most common way a page like this ends up
with a fan spinning up.

## Motion

One easing for entrances: `cubic-bezier(.33, 1, .68, 1)` — outCubic, `1 − (1−t)³`.
Lone Trail uses the sharper `cubic-bezier(.16, 1, .3, 1)` for the same reason its
columns are ruled rather than spaced: a machine settles faster than paper.

| Event | Duration |
| --- | --- |
| Entrance | 720ms (Press) / 620ms (Lone Trail) |
| Cover stagger | 70ms per item |
| Halftone develop | 780ms |
| Odometer | 1500ms, outExpo |
| Scramble | 760ms |
| Page scroll | 700ms |
| CRT scan beam | 11s, linear, infinite |
| Ticker | 42s, linear, infinite |
| De Stijl bars | 3.6 / 2.9 / 4.2s |

`prefers-reduced-motion` short-circuits all of it: the ceremony is skipped, every
`[data-rev]` is shown at rest, halftone plates render at their final state, and
Lone Trail adds `.lt-still` to the root, which stops the beam and the ticker.

The scroll tween passes `behavior: "instant"` to `scrollTo` on every frame. That
looks redundant and is not: `html { scroll-behavior: smooth }` is global, and
without the override the browser's smooth scroller and the JS tween fight each
other, producing a stutter.

## The seal and the launch

Press's cover opens with a full-screen seal that must be clicked; Lone Trail
opens with a launch sequence that counts down and can be dismissed. Both are
overlays that lock the page, and both obey the same three rules:

- `visibility` is transitioned alongside `opacity`, so the overlay leaves the hit
  tree at the end of the fade rather than swallowing clicks throughout it.
- Every path out — click, `Enter`/`Space`, reduced motion, `?skip=1`, an 8-second
  inline fallback — removes `body.locked`. A single missed path leaves the page
  unscrollable.
- `?skip=1` is resolved in an inline script **before first paint**, not at build
  time. A static build has no query string, so deciding this in the frontmatter
  silently produces a page that is always sealed.
- Hiding the overlay on that path must not depend on knowing the skin. Both
  overlays carry `data-ceremony`, and `base.css` hides
  `:root.no-seal [data-ceremony]` with `!important` — the one specificity
  shortcut in the template, because a skin's own scoped rule
  (`:root[data-skin=…] .launch`) outranks anything `base.css` can write without
  naming that skin, and an overlay that survives `?skip=1` is worse than an
  ugly selector. Measured: both skins report `display: none` for their ceremony
  under `?skip=1`, and `visible` without it.

One measured caveat: `body.locked { overflow: hidden }` does **not** actually
stop the viewport in this document, because `html` is `overflow: visible` and the
body-to-viewport propagation does not apply here. `scrollTo(600)` still moves to
600 with the class on. The overlay works because it covers the screen and eats
the wheel events, not because of the CSS. If you need a real lock, `position:
fixed; width: 100%` on the body is the only thing that measured as working.

## Why Lone Trail first read as bare, and what fixed it

The first version of this skin was described as 素 — plain. It had furniture, so
the instinct was to add more of it. Measurement said otherwise.

Three numbers, taken from 1440-wide captures with the sheet region isolated and
the CRT layer off (`?fx=off`), because the scanlines are a fixed overlay and
would otherwise count as ink on every pixel:

| | Press | Lone Trail (before) |
| --- | --- | --- |
| modal paper luma | 238 (`#f6f3eb`) | **248** (`#faf8f5`) |
| pixels within 6 levels of paper | 88% | 63% |
| grid cells (12×8 over the sheet) containing ink | 69/96 | **63/96** |

Lone Trail's sheet is the brightest surface in the project, and it had almost no
middle: ink, paper, and nothing between. That reads as empty no matter how much
you hang on it, because decoration adds *small* dark marks to a large bright
field, which is exactly what the eye already discounts. Press reads furnished
because a third of its sheet is mid-tone — tinted panels, halftone, sheet-on-sheet
layering.

Two structural problems made it worse:

- **The cover's wide column was 823px of bare paper.** The left column's content
  stopped at y=521 while the column ran to 1344, because the 320px right column's
  punch card set the row height. Two thirds of the widest column was empty.
- **The only furniture that survived a still frame was a punch card and a
  colour bar.** Ticker, scanlines and beam are ambient — invisible in a
  screenshot. The launch overlay is dismissed. The grid overlay is off by
  default. Everything else the skin owned was, in a still, nothing.

The fix, in the order it mattered:

1. **Move mass into the void.** The punch card moved from the 320px column to the
   wide one and became a two-up instrument (entry left, bit field right). Dead
   space 823px → 133px, cover 1347px → 963px. Its ten matrix columns went from
   27px to 48px, so the thing finally reads as a card reader.
2. **Give the sheet a mid-tone.** The running head — the one piece of furniture
   on every page — became a solid ink band (`#161618` flood, `#faf8f5` text,
   17.05:1). This is the cheapest possible mid-tone: it costs one rule, it is on
   every route, and it inverts the paper/ink relationship so the page stops
   being a bright field with marks on it.
3. **Make under-filled pages structural.** `/tags/` had a 550px void under nine
   chips. The cloud became a ruled register: one row per label, count
   right-aligned, zebra banded. Same markup, one row per tag, 412px tall instead
   of 40px — the block now carries the page.

Result, sheet region only, cover: bare paper 63% → 68% but with the sheet 384px
shorter, and ink-bearing grid cells 63/96 → **84/96**. `/tags/` went from 55/96
cells and a 326px sheet to 88/96 cells and 703px. No decoration was added: a
panel was made solid, a list was made a table, and a block was moved where there
was room for it.

(The honest caveat: after moving the punch card the cover's *ink percentage* went
down, 8.3% → 7.3%, because the card is now spread across a wide column instead of
crammed into a narrow one, and the sheet lost 384px of nothing. Ink percentage
rewards cramming; the grid-occupancy number is the one that tracks "does this
read as furnished", because it asks whether every region of the page has
something in it.)

**The transferable rule: plainness is a coverage problem before it is a
decoration problem.** Ask which regions of the sheet have nothing in them — a
12×8 occupancy grid over the sheet is enough — before adding an ornament. Press
reads furnished because 69 of 96 cells carry ink, not because it has more
furniture: Lone Trail had *more* furniture and 63. And furniture has to survive a
still frame: ambient effects (scanlines, marquees, beams) are atmosphere, not
structure, and a page furnished only with atmosphere has no furniture.

## Media queries must come last in a skin file

`scripts/scope-skins.mjs` rewrites every rule to the same specificity
(`:root[data-skin='x'] …`). That means **source order alone decides**, and a
`@media` block placed above the base rule it is meant to override loses.

This bit for real: the 760px punch-card rules were written next to the other
breakpoints near the top of `skin.css`, and at 390px the matrix kept
`grid-column: 2` and was **16px wide** — the rule was in the stylesheet, valid,
and simply outranked by the base rule further down. Moving the block to the end
of the file fixed it (matrix 289px wide, ten columns of 28px).

Rule: **breakpoints go at the bottom of the skin file, after everything they
override.** The same applies inside a media block — later wins.

Related, from the same change: `grid-auto-columns: 1fr` is `minmax(auto, 1fr)`,
so a column never shrinks below its min-content width and ten of them overflow a
390px card. `minmax(0, 1fr)` is the one that actually shares what is there.

## Colour containment, and the scoping rule

`src/styles/base.css` contains no colour literal and no font name. Every visual
decision lives in a skin. `npm run check` enforces this with a regex over every
`.css`, `.astro` and `.ts` file outside `src/skins/`.

That rule is only half of what a second skin needs. The other half is that two
skins' stylesheets ship together in one bundle, so **an unscoped selector is a
global override**. This was not a theory: a throwaway probe skin containing
`.masthead { background: red }` repainted the masthead for Press visitors too,
because the emitted bundle put that rule after Press's own.

The fix is `scripts/scope-skins.mjs`, which runs before every build and rewrites
each rule in each skin file to `:root[data-skin='<id>'] <selector>` before
concatenating. Authors therefore write plain CSS and never think about the scope;
the token block is the one thing already scoped, and the scoper leaves it alone.
`@media` and `@supports` are recursed into, `@font-face` / `@keyframes` /
`@property` pass through.

Keeping both rules — colour containment and automatic scoping — is what makes a
third skin a folder copy rather than an audit.
