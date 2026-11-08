/**
 * Paper skin — the client layer.
 *
 * Progressive by construction: with JavaScript off the site is a complete,
 * readable document. What this file adds is the printed behaviour — the
 * opening page, the engraving in the margin column, the column grid, the
 * marginal rail and the staggered settling of a page as it comes into view.
 *
 * Rules specific to this skin:
 *   - The figure is an **engraving**, not a halftone: burin lines cut across
 *     the plate whose weight follows a density field. It is deliberately the
 *     oldest reproduction method in the set, because this is the skin that
 *     pretends to be a book.
 *   - There is no barcode and no telemetry strip. `barcode` and `marquee` are
 *     false in this skin's meta, so the markup is never emitted and nothing
 *     here looks for it.
 *   - The opening page is a frontispiece: it is dismissed by click, Enter,
 *     Escape, `?skip=1`, or the inline 8s timeout in Chrome.astro that fires
 *     even if this bundle never loads.
 *
 * Rules inherited from the project as a whole:
 *   - Nothing here makes a noise.
 *   - `prefers-reduced-motion` short-circuits the ceremony, and the reduced
 *     path still paints every figure — it just paints it in one pass.
 *   - Canvas backing stores are capped at DPR 2 and paint once, then lock.
 */
import {
  bootReveals,
  clamp01,
  dpr,
  enableMotion,
  hash,
  onEnter,
  outCubic,
  reduceMotion,
  settleEverything,
} from '../../lib/motion';
import { initRail } from '../../lib/rail';

/* -------------------------------------------------------------------------- */
/* the engraving                                                               */
/* -------------------------------------------------------------------------- */

type Sampler = (x: number, y: number) => number;

/**
 * Density fields, 0..1 where 1 is solid ink. Deterministic, so a figure looks
 * the same on every visit — a printed plate does not change between copies.
 */
function makeSampler(variant: string, w: number, h: number): Sampler {
  const cx = w * 0.5;
  const cy = h * 0.5;

  switch (variant) {
    // A landscape: a low horizon, a risen moon, a bank of cloud. This is the
    // figure the cover uses, and it reads as a woodcut rather than a screen.
    case 'figure': {
      return (x, y) => {
        const u = x / w;
        const v = y / h;

        const moonX = 0.66;
        const moonY = 0.28;
        const moon =
          Math.exp(-(((u - moonX) ** 2 + (v - moonY) ** 2) * 210)) * 0.92 +
          Math.exp(-(((u - moonX) ** 2 + (v - moonY) ** 2) * 26)) * 0.1;

        const horizon = 0.66;
        const ground = v > horizon ? 0.76 + 0.24 * Math.sin(u * 7.1 + 1.4) : 0;

        const bank =
          Math.exp(-(((u - 0.3) ** 2) * 7 + ((v - 0.46) ** 2) * 90)) * 0.5 +
          Math.exp(-(((u - 0.52) ** 2) * 14 + ((v - 0.38) ** 2) * 140)) * 0.34;

        const sky = 0.06 + 0.1 * clamp01(1 - v / horizon);

        return clamp01(sky + bank + moon + ground);
      };
    }

    // Contour ridges: concentric bands pulled off-centre, the look of a
    // topographic plate pasted into a report.
    case 'ridge': {
      return (x, y) => {
        const dx = (x - cx) / (w * 0.55);
        const dy = (y - cy * 1.1) / (h * 0.62);
        const r = Math.sqrt(dx * dx + dy * dy * 1.6);
        const bend = Math.sin(Math.atan2(dy, dx) * 3.2) * 0.16;
        const band = Math.abs(((r + bend) * 5.5) % 1) - 0.5;
        return clamp01(Math.abs(band) * 3.2 * clamp01(1.15 - r * 0.7));
      };
    }

    // Cross-hatch: two rulings at right angles, the fallback "printed texture".
    case 'hatch': {
      return (x, y) => {
        const a = Math.sin((x + y * 0.6) * 0.16) * 0.5 + 0.5;
        const b = Math.sin((y - x * 0.4) * 0.21) * 0.5 + 0.5;
        return clamp01(a * b * 1.9 - 0.42);
      };
    }

    // Paper grain: sparse, uneven, what a plate picks up when it is nearly dry.
    case 'grain':
    default: {
      return (x, y) => {
        const n =
          hash(Math.floor(x / 7) * 2.7 + Math.floor(y / 7) * 6.3) * 0.6 +
          hash(Math.floor(x / 3) * 9.1 + Math.floor(y / 3) * 4.4) * 0.4;
        return clamp01(n * n * 1.8);
      };
    }
  }
}

/** Ink colours for the plate. Kept here so the canvas never reads CSS. */
const INK = '#1c1a17';
const GROUND = '#f3efe6';
const SPOT = '#17356a';

/**
 * Cut an engraving. One-shot: `dataset.drawn` locks it so a resize never
 * re-rasters and shimmers. The geometry guard runs before the lock so a canvas
 * measured while hidden can retry on the next reveal.
 */
export function plate(cv: HTMLCanvasElement, { animate = true } = {}): void {
  const rect = cv.getBoundingClientRect();
  if (rect.width < 60 || rect.height < 40) return;
  if (cv.dataset.drawn === '1') return;

  const ratio = dpr();
  const w = rect.width;
  const h = rect.height;
  cv.width = Math.round(w * ratio);
  cv.height = Math.round(h * ratio);

  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.scale(ratio, ratio);

  const sample = makeSampler(cv.dataset.plate || 'grain', w, h);

  // Burin lines are widely spaced and dark where the field is dense; the
  // spacing is fixed so the row count can be computed up front for the reveal.
  const pitch = Math.max(3.4, Math.min(5.2, h / 96));
  const rows = Math.ceil(h / pitch) + 1;

  const drawRows = (count: number) => {
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < count && i < rows; i++) {
      const y = i * pitch;
      // Sample across the row and stroke it in runs, so one row is a path
      // rather than a stack of little rectangles.
      let runStart: number | null = null;
      let runWeight = 0;

      const colStep = 2;
      for (let x = 0; x <= w + colStep; x += colStep) {
        const d = x > w ? 0 : sample(x, y);
        if (d > 0.055) {
          if (runStart === null) runStart = x;
          runWeight = Math.max(runWeight, d);
        } else if (runStart !== null) {
          const weight = Math.min(pitch * 0.92, 0.5 + runWeight * pitch * 1.35);
          ctx.fillStyle = runWeight > 0.86 ? SPOT : INK;
          ctx.globalAlpha = 0.5 + runWeight * 0.5;
          ctx.fillRect(runStart, y + (pitch - weight) / 2, x - runStart, weight);
          runStart = null;
          runWeight = 0;
        }
      }
    }
    ctx.globalAlpha = 1;

    // A second, vertical passage through the densest part of the plate. Real
    // engravings cross-hatch their shadows; without this the figure is flat.
    const pass = Math.ceil((count / rows) * 34);
    for (let k = 0; k < pass; k++) {
      const x = (k / 34) * w + 1;
      for (let y = 0; y < h; y += 4) {
        if (sample(x, y) < 0.72) continue;
        ctx.fillStyle = INK;
        ctx.globalAlpha = 0.42;
        ctx.fillRect(x, y, 0.9, 3.2);
      }
    }
    ctx.globalAlpha = 1;
  };

  if (!animate || reduceMotion()) {
    drawRows(rows);
    cv.dataset.drawn = '1';
    return;
  }

  const start = performance.now();
  const duration = 640;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    drawRows(rows);
    cv.dataset.drawn = '1';
  };

  const frame = (now: number) => {
    if (finished) return;
    const p = clamp01((now - start) / duration);
    drawRows(Math.ceil(outCubic(p) * rows));
    if (p < 1) requestAnimationFrame(frame);
    else finish();
  };

  requestAnimationFrame(frame);

  // A stalled rAF (background tab, throttled iframe) must not leave a blank
  // plate: the lock is set here, not up front.
  setTimeout(finish, duration + 500);
}

/* -------------------------------------------------------------------------- */
/* column grid                                                                 */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* table of contents                                                           */
/* -------------------------------------------------------------------------- */

function initToc() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'));
  if (!links.length) return;

  const targets = links
    .map((a) => {
      const id = decodeURIComponent(a.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      return el ? { a, el } : null;
    })
    .filter((x): x is { a: HTMLAnchorElement; el: HTMLElement } => !!x);

  if (!targets.length) return;

  const mark = () => {
    const edge = 120;
    let active = targets[0];
    for (const t of targets) {
      if (t.el.getBoundingClientRect().top <= edge) active = t;
      else break;
    }
    links.forEach((a) => a.classList.toggle('on', a === active.a));
  };

  let queued = false;
  addEventListener(
    'scroll',
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        mark();
      });
    },
    { passive: true },
  );

  mark();
}

/* -------------------------------------------------------------------------- */
/* the frontispiece                                                            */
/* -------------------------------------------------------------------------- */

function initSeal() {
  const seal = document.getElementById('paper-seal');
  if (!seal) return;

  const btn = seal.querySelector<HTMLButtonElement>('.paper-seal-btn');
  let open = true;

  if (btn) btn.focus({ preventScroll: true });

  const release = () => {
    if (!open) return;
    open = false;
    seal.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;

    // The opening page *is* the cover's entrance: hand the reveal pass its cue
    // now that the sheet is turning, on a short stagger, so the page arrives
    // rather than merely being uncovered.
    document.querySelectorAll<HTMLElement>('.cover [data-rev]').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), 50 + i * 70);
    });
    bootReveals(plate);
  };

  btn?.addEventListener('click', release);

  addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      release();
    }
  });

  // Safety net above the inline one: if rAF or the observer stalled, the page
  // must still become reachable.
  setTimeout(release, 12000);
}

/* -------------------------------------------------------------------------- */
/* the doubled rule, drawn as each section is reached                          */
/* -------------------------------------------------------------------------- */

function initSpreads() {
  const spreads = Array.from(document.querySelectorAll<HTMLElement>('.spread'));
  if (!spreads.length) return;

  spreads.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('in');
      return;
    }
    onEnter([el], () => el.classList.add('in'), 0.06);
  });
}

/* -------------------------------------------------------------------------- */
/* stagger                                                                     */
/* -------------------------------------------------------------------------- */

const STAGGER_GROUPS = '.ix-list, .tag-cloud, .meta-rows, .post-nav, .toc ol, .colo';
const STAGGER_STEP = 42;
const STAGGER_DUR = 620;

/** Return a group to rest: no `data-stag`, no inline `--i`. */
function release(group: HTMLElement) {
  group.classList.remove('in');
  delete group.dataset.stag;
  Array.from(group.children).forEach((kid) =>
    (kid as HTMLElement).style.removeProperty('--i'),
  );
}

/**
 * Reveal `el` as soon as it is on screen: synchronously if it already is,
 * otherwise when it scrolls in. The synchronous branch matters — an observer
 * answers on the next frame, which for already-painted content is late enough
 * to be seen as a flicker.
 */
function revealSeen(el: HTMLElement, onSeen: () => void) {
  const r = el.getBoundingClientRect();
  const seen = r.height > 0 && r.top < window.innerHeight && r.bottom > 0;
  if (seen) {
    onSeen();
    return;
  }
  onEnter([el], onSeen, 0.05);
}

function initStagger() {
  const armed: Array<{ el: HTMLElement; fire: () => void }> = [];

  const groups = Array.from(document.querySelectorAll<HTMLElement>(STAGGER_GROUPS)).filter(
    (g) => g.children.length > 0,
  );

  groups.forEach((group) => {
    const kids = Array.from(group.children) as HTMLElement[];

    // A group with no geometry sits in an inactive skin wrapper or behind a
    // hidden ancestor; staggering it would hide it permanently.
    if (!group.getBoundingClientRect().height) return;

    group.dataset.stag = '';
    kids.forEach((kid, i) => kid.style.setProperty('--i', String(Math.min(i, 10))));

    const fire = () => {
      if (group.classList.contains('in')) return;
      group.classList.add('in');
      // Handing children back to their own transitions is what keeps `:hover`
      // instant; without this the hover rule inherits the stagger delay.
      const settle = Math.min(kids.length, 11) * STAGGER_STEP + STAGGER_DUR;
      setTimeout(() => release(group), settle);
    };

    armed.push({ el: group, fire });
    revealSeen(group, fire);
  });

  if (!armed.length) return;

  // The observer is the primary trigger, but a stalled animation must not leave
  // permanently invisible content. One passive listener guarantees anything
  // that reaches the viewport by any means is started anyway.
  const check = () => {
    for (let i = armed.length - 1; i >= 0; i--) {
      const r = armed[i].el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        armed[i].fire();
        armed.splice(i, 1);
      }
    }
    if (!armed.length) {
      removeEventListener('scroll', check);
      removeEventListener('resize', check);
    }
  };

  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
}

/* -------------------------------------------------------------------------- */
/* boot                                                                        */
/* -------------------------------------------------------------------------- */

function boot() {
  if (document.documentElement.dataset.skin !== 'paper') return;

  const noSeal = document.documentElement.classList.contains('no-seal');
  const motion = enableMotion();

  initToc();
  initRail({ skin: 'paper' });

  const sealed =
    !noSeal &&
    !!document.getElementById('paper-seal') &&
    document.body.classList.contains('locked');

  if (!motion) {
    document.getElementById('paper-seal')?.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;
    document.querySelectorAll<HTMLElement>('.spread').forEach((el) => el.classList.add('in'));
    settleEverything(plate);
    return;
  }

  initSpreads();

  if (sealed) initSeal();
  else (window as any)._unsealed = true;

  initStagger();

  if (!sealed) bootReveals(plate);
  // When the opening page is up it owns the cover's entrance, so `bootReveals`
  // runs after `release()` reveals the cover itself; every other page enters here.
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}