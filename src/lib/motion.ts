/**
 * motion.ts — the motion primitives every skin shares.
 *
 * These are not a skin. They are the vocabulary a skin uses to animate:
 * easing curves, a deterministic hash, the reveal observer, the decode
 * (scramble) effect and the odometer. Keeping them here means a skin can be
 * deleted without taking the other skins' animation with it — which is the
 * whole point of a skin being a folder you can remove.
 *
 * Rules that hold for every caller:
 *   - `prefers-reduced-motion` short-circuits everything to its end state.
 *   - Canvas backing stores are capped at DPR 2.
 *   - Nothing here touches the DOM at import time.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Deterministic pseudo-random in [0,1). Stable across runs, so plates never flicker. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export const reduceMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const dpr = () => Math.min(2, window.devicePixelRatio || 1);

/** Run `fn` once the element is actually in the viewport. */
export function onEnter(els: Element[], fn: (el: Element) => void, threshold = 0.22) {
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        fn(e.target);
      }
    },
    { threshold },
  );
  els.forEach((el) => io.observe(el));
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';

export type ScrambleOpts = { duration?: number; tail?: number; tick?: number };

/** Decode a string in place. Idempotent: the target is cached in dataset.text. */
export function scramble(el: HTMLElement, opts: ScrambleOpts = {}): void {
  const { duration = 760, tail = 3, tick = 32 } = opts;
  const target = el.dataset.text ?? el.textContent ?? '';
  el.dataset.text = target;
  if (!target) return;

  const prior = (el as any)._scrambleRaf as number | undefined;
  if (prior) cancelAnimationFrame(prior);

  if (reduceMotion()) {
    el.textContent = target;
    return;
  }

  const start = performance.now();
  let lastRoll = 0;
  let tailText = '';

  const frame = (now: number) => {
    const p = clamp01((now - start) / duration);
    const solved = Math.floor(outCubic(p) * target.length);

    if (now - lastRoll > tick) {
      lastRoll = now;
      tailText = Array.from(
        { length: tail },
        () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      ).join('');
    }

    el.textContent = target.slice(0, solved) + (p < 1 ? tailText : '');

    if (p < 1) {
      (el as any)._scrambleRaf = requestAnimationFrame(frame);
    } else {
      el.textContent = target;
    }
  };

  (el as any)._scrambleRaf = requestAnimationFrame(frame);
}

/** Count up to `to`. Snaps to the exact formatted value on the last frame. */
export function ode(el: HTMLElement, to: number, dec = 0, duration = 1500): void {
  const fmt = (n: number) =>
    dec > 0 ? n.toFixed(dec) : Math.floor(n).toLocaleString('en-US');

  if (reduceMotion()) {
    el.textContent = fmt(to);
    return;
  }

  const prior = (el as any)._odeRaf as number | undefined;
  if (prior) cancelAnimationFrame(prior);

  const start = performance.now();

  const frame = (now: number) => {
    const p = clamp01((now - start) / duration);
    el.textContent = fmt(to * outExpo(p));
    if (p < 1) {
      (el as any)._odeRaf = requestAnimationFrame(frame);
    } else {
      el.textContent = fmt(to);
    }
  };

  (el as any)._odeRaf = requestAnimationFrame(frame);
}

/** Throttled wrapper, so pointer spam cannot machine-gun an effect. */
export function throttled(fn: () => void, ms: number) {
  let last = 0;
  return () => {
    const now = performance.now();
    if (now - last < ms) return;
    last = now;
    fn();
  };
}

/**
 * The reveal pass. Every skin needs this: it is what turns `[data-rev]` blocks
 * from invisible to visible, and what triggers the per-block effects.
 *
 * `paintPlate` is the skin's own plate painter (halftone, scanline sphere,
 * whatever), so the reveal system does not have to know which skin is running.
 */
export function bootReveals(paintPlate: (cv: HTMLCanvasElement) => void) {
  const revs = Array.from(document.querySelectorAll<HTMLElement>('[data-rev]'));

  onEnter(revs, (el) => {
    el.classList.add('in');
    el.querySelectorAll<HTMLElement>('[data-scramble]').forEach((s) => scramble(s));
    el.querySelectorAll<HTMLElement>('[data-ode]').forEach((o) =>
      ode(o, Number(o.dataset.ode), Number(o.dataset.dec ?? 0)),
    );
    el.querySelectorAll<HTMLCanvasElement>('canvas[data-plate]').forEach(paintPlate);
    if (el.matches('canvas[data-plate]')) paintPlate(el as HTMLCanvasElement);
  });

  // Plates and counters that live outside any reveal block.
  const loose = Array.from(
    document.querySelectorAll<HTMLCanvasElement>('canvas[data-plate]'),
  ).filter((cv) => !cv.closest('[data-rev]'));
  onEnter(loose, (el) => paintPlate(el as HTMLCanvasElement), 0.3);

  const looseOde = Array.from(document.querySelectorAll<HTMLElement>('[data-ode]')).filter(
    (o) => !o.closest('[data-rev]'),
  );
  onEnter(
    looseOde,
    (el) => {
      const o = el as HTMLElement;
      ode(o, Number(o.dataset.ode), Number(o.dataset.dec ?? 0));
    },
    0.3,
  );
}

/** The reduced-motion / no-JS-ceremony path: everything straight to its end state. */
export function settleEverything(paintPlate: (cv: HTMLCanvasElement) => void) {
  document.querySelectorAll<HTMLElement>('[data-rev]').forEach((el) => el.classList.add('in'));
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-plate]').forEach(paintPlate);
  document.querySelectorAll<HTMLElement>('[data-ode]').forEach((o) =>
    ode(o, Number(o.dataset.ode), Number(o.dataset.dec ?? 0), 1),
  );
}

/** Adds `js-motion` only when motion is both wanted and possible. */
export function enableMotion(): boolean {
  const noSeal = document.documentElement.classList.contains('no-seal');
  const motion = !reduceMotion() && !noSeal;
  if (motion) document.documentElement.classList.add('js-motion');
  return motion;
}

/** True when this skin is the one the document is actually wearing. */
export function isActiveSkin(id: string): boolean {
  return document.documentElement.dataset.skin === id;
}
