/**
 * Terminal skin — the client layer.
 *
 * Progressive by construction: with JavaScript off the site is a complete
 * document on dark ground. This file adds the console behaviour — the boot
 * ceremony, the halftone plate, the barcode, the grid overlay, the stagger.
 *
 * Rules that carry over from the other skins:
 *   - Nothing here makes a noise.
 *   - `prefers-reduced-motion` short-circuits the ceremony and every tween
 *     checks it; the rail still mounts, because it is chrome, not an effect.
 *   - Canvas backing stores are capped at DPR 2 and paint once, then lock.
 *
 * Rules specific to this skin:
 *   - The ceremony is a *link establishment*, not a lock: it can be dismissed by
 *     click, Enter, Escape, `?skip=1`, or the inline 8s timeout in Chrome.astro
 *     that fires even if this bundle never loads.
 *   - A plate is drawn in ink-on-dark with a single yellow register mark, which
 *     is the only place in this skin where the accent appears inside a figure.
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
/* halftone                                                                    */
/* -------------------------------------------------------------------------- */

type Sampler = (x: number, y: number) => number;

/**
 * Density fields, 0..1 where 1 is solid ink. Deterministic, so a plate looks
 * the same on every visit.
 */
function makeSampler(variant: string, w: number, h: number): Sampler {
  const cx = w / 2;
  const cy = h / 2;

  switch (variant) {
    case 'orbit': {
      const rings = 5;
      return (x, y) => {
        const dx = (x - cx) / (w * 0.5);
        const dy = (y - cy) / (h * 0.5);
        const r = Math.sqrt(dx * dx + dy * dy);
        const a = Math.atan2(dy, dx);
        const ring = Math.sin(r * rings * Math.PI * 1.6 + a * 0.6) * 0.5 + 0.5;
        const falloff = clamp01(1 - r * 0.85);
        return clamp01(ring * falloff * 1.15);
      };
    }
    case 'wave': {
      return (x, y) => {
        const u = x / w;
        const v = y / h;
        const a = Math.sin(u * Math.PI * 5 + v * 2.2) * 0.5 + 0.5;
        const b = Math.sin(v * Math.PI * 7 - u * 1.4) * 0.5 + 0.5;
        return clamp01(a * b * 1.5 - 0.18);
      };
    }
    case 'grid': {
      const stepX = w / 9;
      const stepY = h / 7;
      return (x, y) => {
        const gx = Math.abs(((x % stepX) / stepX) - 0.5) * 2;
        const gy = Math.abs(((y % stepY) / stepY) - 0.5) * 2;
        return clamp01(Math.max(gx, gy) ** 2.2);
      };
    }
    case 'figure': {
      // A composed specimen: soft body, a hard horizon, a bright disc. The same
      // field as the paper skins, inverted in value — on dark, the body is the
      // light thing.
      return (x, y) => {
        const u = x / w;
        const v = y / h;
        const body = Math.exp(-((u - 0.5) ** 2) * 9 - ((v - 0.62) ** 2) * 14) * 1.25;
        const disc = Math.exp(-(((u - 0.68) ** 2 + (v - 0.3) ** 2) * 90)) * 1.1;
        const horizon = v > 0.78 ? 0.42 * clamp01(1 - (v - 0.78) * 4.5) : 0;
        return clamp01(body + disc + horizon);
      };
    }
    case 'noise':
    default: {
      return (x, y) => {
        const n =
          hash(Math.floor(x / 9) * 3.1 + Math.floor(y / 9) * 7.7) * 0.55 +
          hash(Math.floor(x / 3) * 11.3 + Math.floor(y / 3) * 5.1) * 0.45;
        return clamp01(n);
      };
    }
  }
}

/**
 * Paint a plate. One-shot: `dataset.drawn` locks it so a resize never re-rasters
 * and shimmers. The geometry guard runs before the lock so a canvas measured
 * while hidden can retry on the next reveal.
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

  const cell = Number(cv.dataset.cell) || 4;
  const sample = makeSampler(cv.dataset.plate || 'noise', w, h);

  const ground = '#222222';
  const ink = '#ededed';
  const accent = '#fffa00';

  const drawRows = (rows: number) => {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(w / cell);
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const px = cx * cell + cell / 2;
        const py = ry * cell + cell / 2;
        const d = sample(px, py);
        if (d <= 0.03) continue;

        // A sparse ring of accent dots is the register mark on the plate.
        const isAccent = hash(cx * 3.1 + ry * 5.7) > 0.992;
        const r = Math.min(cell * 0.63, Math.sqrt(d) * cell * (isAccent ? 0.34 : 0.63));

        const jx = (hash(cx * 1.7 + ry * 2.3) - 0.5) * 0.32 * cell;
        const jy = (hash(cx * 2.9 + ry * 4.1) - 0.5) * 0.32 * cell;

        ctx.beginPath();
        ctx.fillStyle = isAccent ? accent : ink;
        ctx.arc(px + jx, py + jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const totalRows = Math.ceil(h / cell);

  if (!animate || reduceMotion()) {
    drawRows(totalRows);
    cv.dataset.drawn = '1';
    return;
  }

  const start = performance.now();
  const duration = 520;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    drawRows(totalRows);
    cv.dataset.drawn = '1';
  };

  const frame = (now: number) => {
    if (finished) return;
    const p = clamp01((now - start) / duration);
    drawRows(Math.ceil(outCubic(p) * totalRows));
    if (p < 1) requestAnimationFrame(frame);
    else finish();
  };

  requestAnimationFrame(frame);

  // A stalled rAF (background tab, throttled iframe) must not leave a blank
  // plate: the lock is set here, not up front.
  setTimeout(finish, duration + 400);
}

/* -------------------------------------------------------------------------- */
/* barcode                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A decorative Code-39-ish strip, drawn inverted for this skin. Reads the
 * canvas `width`/`height` attributes, so the element must carry them.
 */
export function barcode(cv: HTMLCanvasElement): void {
  const code = cv.dataset.barcode || 'ARCHIVE';
  const w = cv.width;
  const h = cv.height;
  if (!w || !h) return;

  const ratio = dpr();
  cv.width = Math.round(w * ratio);
  cv.height = Math.round(h * ratio);

  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = '#222222';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ededed';

  let x = 4;
  for (let c = 0; c < code.length; c++) {
    const ch = code.charCodeAt(c);
    for (let k = 0; k < 4; k++) {
      const barW = 1 + Math.floor(hash(ch * 0.7 + k * 3.1 + c) * 4);
      const gap = 1 + Math.floor(hash(ch * 1.3 + k) * 3);
      if (hash(ch + k * 1.7) > 0.32) {
        ctx.fillRect(x, 6, barW, h - 12);
      }
      x += barW + gap;
      if (x > w - 8) break;
    }
    x += 3;
    if (x > w - 8) break;
  }
}

function initBarcodes() {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-barcode]').forEach(barcode);
}

/* -------------------------------------------------------------------------- */
/* grid overlay                                                                */
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
/* the boot ceremony                                                           */
/* -------------------------------------------------------------------------- */

function initSeal() {
  const seal = document.getElementById('term-seal');
  if (!seal) return;

  const btn = seal.querySelector<HTMLButtonElement>('.term-seal-btn');
  let open = true;

  // The strip is decorative and cheap; the bar is a CSS animation so it costs
  // nothing per frame. What JS owns is the dismissal.
  // Focus the overlay itself, not the button: the button is the only control on
  // screen and a focus ring on it reads as "pressed" before the visitor has done
  // anything. The overlay is a dialog with tabindex="-1", so focus still lands
  // inside it and the keydown handler below still gets the keys.
  seal.focus({ preventScroll: true });

  const release = () => {
    if (!open) return;
    open = false;
    seal.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;
    // The ceremony *is* the cover's entrance: hand the reveal pass its cue now
    // that the overlay is lifting, on a short stagger so the page arrives
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
/* stagger                                                                     */
/* -------------------------------------------------------------------------- */

const STAGGER_GROUPS =
  '.ix-list, .tag-cloud, .meta-rows, .post-nav, .toc ol, .stag-group';
const STAGGER_STEP = 38;
const STAGGER_DUR = 700;

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
  document.querySelectorAll<HTMLElement>('.rh').forEach((el) => {
    revealSeen(el, () => el.classList.add('in'));
  });

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
  if (document.documentElement.dataset.skin !== 'terminal') return;

  const noSeal = document.documentElement.classList.contains('no-seal');
  const motion = enableMotion();

  initBarcodes();
  initToc();
  initRail({ skin: 'terminal' });

  const sealed =
    !noSeal &&
    !!document.getElementById('term-seal') &&
    document.body.classList.contains('locked');

  if (!motion) {
    document.getElementById('term-seal')?.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;
    settleEverything(plate);
    return;
  }

  if (sealed) initSeal();
  else (window as any)._unsealed = true;

  initStagger();

  if (!sealed) bootReveals(plate);
  // When the ceremony is up it owns the cover's entrance, so `bootReveals` runs
  // after `release()` reveals the cover itself; every other page enters here.
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
