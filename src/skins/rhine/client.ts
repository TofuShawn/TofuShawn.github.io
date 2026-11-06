/**
 * Rhine skin — the client layer.
 *
 * Everything here is progressive: with JavaScript disabled the site is a
 * complete, readable document. This file adds the press-room behaviour —
 * halftone plates, the seal, sound, the grid overlay, the coordinate HUD.
 *
 * Design rules carried from the reference dossier:
 *   - No sound before a user gesture. The AudioContext is created inside the
 *     first sfx() call and resumed there, never at load.
 *   - prefers-reduced-motion short-circuits the whole intro, and every tween
 *     checks it.
 *   - Canvas backing stores are capped at DPR 2.
 *   - Halftone paints once and locks, because a redraw on resize costs more
 *     than it is worth and produces visible shimmer.
 *
 * The generic motion primitives (easing, hash, scramble, odometer, the reveal
 * observer) live in `src/lib/motion.ts`, because a second skin needs them too
 * and a skin must be deletable without taking the other skins' animation with
 * it. This file is only what is specific to *paper*.
 */
import {
  bootReveals,
  dpr,
  enableMotion,
  hash,
  reduceMotion,
  scramble,
  settleEverything,
  throttled,
} from '../../lib/motion';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/* -------------------------------------------------------------------------- */
/* sound                                                                       */
/* -------------------------------------------------------------------------- */

type Voice = {
  noise?: boolean;
  dur: number;
  g: number;
  f?: number;
  sweep?: [number, number];
  sweepFilter?: [number, number];
  hp?: number;
  type?: OscillatorType;
  drop?: number;
  notes?: number[];
  gap?: number;
};

/**
 * Synthesised voices. No audio files ship with this template: every sound is
 * built from an oscillator or a filtered noise buffer at call time.
 */
const VOICES: Record<string, Voice> = {
  ui: { type: 'sine', f: 660, dur: 0.05, g: 0.08 },
  beep: { type: 'square', f: 880, dur: 0.04, g: 0.05 },
  chime: { notes: [880, 1320], type: 'sine', dur: 0.3, g: 0.1, gap: 0.08 },
  thump: { type: 'sine', f: 120, drop: 0.4, dur: 0.16, g: 0.24 },
  stamp: { notes: [140, 96], type: 'sine', dur: 0.07, g: 0.3, gap: 0.04 },
  step: { type: 'sine', f: 200, drop: 0.7, dur: 0.05, g: 0.05 },
  paper: { noise: true, dur: 0.42, g: 0.2, sweepFilter: [2400, 900], hp: 480 },
  tear: { noise: true, dur: 0.5, g: 0.2, sweepFilter: [5200, 700], hp: 1200 },
  scratch: { noise: true, dur: 0.19, g: 0.16, sweepFilter: [3600, 1400], hp: 900 },
  scan: { type: 'sawtooth', sweep: [400, 1600], dur: 1.1, g: 0.16 },
  power: { type: 'triangle', sweep: [180, 720], dur: 0.6, g: 0.12 },
  unlock: { notes: [520, 780], type: 'sine', dur: 0.12, g: 0.1, gap: 0.06 },
};

let ac: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
    return null;
  }
  if (!ac) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    ac = new Ctor() as AudioContext;
  }
  return ac;
}

/** Silences sound during programmatic scrolling, by deadline rather than flag. */
let muteUntil = 0;

export function sfx(kind: string = 'ui'): void {
  const v = VOICES[kind];
  if (!v) return;
  if (performance.now() < muteUntil) return;

  try {
    const ctx = audio();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    const t0 = ctx.currentTime;

    if (v.noise) {
      // Smoothed noise: raw white noise sounds like static, not paper.
      const len = Math.max(1, Math.floor(ctx.sampleRate * v.dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = last * 0.35 + (Math.random() * 2 - 1) * 0.65;
        data[i] = last;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      if (v.sweepFilter) {
        filter.frequency.setValueAtTime(v.sweepFilter[0], t0);
        filter.frequency.exponentialRampToValueAtTime(v.sweepFilter[1], t0 + v.dur);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(v.g, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);

      let node: AudioNode = src;
      node.connect(filter);
      node = filter;

      if (v.hp) {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = v.hp;
        node.connect(hp);
        node = hp;
      }

      node.connect(gain).connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + v.dur);
      return;
    }

    const play = (freq: number, at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = v.type ?? 'sine';
      osc.frequency.setValueAtTime(freq, at);

      if (v.sweep) {
        osc.frequency.exponentialRampToValueAtTime(v.sweep[1], at + v.dur);
      } else if (v.drop) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * v.drop), at + v.dur * 4);
      }

      gain.gain.setValueAtTime(v.g, at);
      gain.gain.setValueAtTime(v.g, at + v.dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + v.dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + v.dur + 0.02);
    };

    if (v.notes) {
      v.notes.forEach((n, i) => play(n, t0 + i * (v.gap ?? 0)));
    } else {
      play(v.sweep ? v.sweep[0] : (v.f ?? 440), t0);
    }
  } catch {
    // Audio is a garnish. Any failure — no device, blocked context, headless
    // browser — degrades to silence and must never break the page.
  }
}

/* -------------------------------------------------------------------------- */
/* halftone                                                                    */
/* -------------------------------------------------------------------------- */

type Sampler = (x: number, y: number) => number;

/**
 * Procedural density fields. Each returns 0..1, where 1 is solid ink.
 * They are deterministic, so a plate looks the same on every visit.
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
      // A composed "specimen": soft body, a hard horizon, a bright disc.
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
 * Paint a plate. One-shot by design: `dataset.drawn` locks the canvas so it
 * never repaints on resize (which would shimmer and cost a full re-raster).
 */
export function halftone(cv: HTMLCanvasElement, { animate = true } = {}): void {
  const rect = cv.getBoundingClientRect();
  // Guard runs before the lock, so a canvas measured while hidden can retry.
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
  const variant = cv.dataset.plate || 'noise';
  const sample = makeSampler(variant, w, h);

  const paper = '#efece2';
  const ink = '#151513';
  const accent = '#e9521c';

  const drawRows = (rows: number) => {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);

    const cols = Math.ceil(w / cell);
    const totalRows = Math.ceil(h / cell);

    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const px = cx * cell + cell / 2;
        const py = ry * cell + cell / 2;
        const d = sample(px, py);
        if (d <= 0.03) continue;

        const isAccent = hash(cx * 3.1 + ry * 5.7) > 0.994;
        const r = Math.min(cell * 0.63, Math.sqrt(d) * cell * (isAccent ? 0.34 : 0.63));

        // Jitter breaks the moiré that a perfectly regular screen produces.
        const jx = (hash(cx * 1.7 + ry * 2.3) - 0.5) * 0.32 * cell;
        const jy = (hash(cx * 2.9 + ry * 4.1) - 0.5) * 0.32 * cell;

        ctx.beginPath();
        ctx.fillStyle = isAccent ? accent : ink;
        ctx.arc(px + jx, py + jy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return totalRows;
  };

  if (!animate || reduceMotion()) {
    drawRows(Math.ceil(h / cell));
    cv.dataset.drawn = '1';
    return;
  }

  // Develop row by row, like a print coming up in the tray.
  const totalRows = Math.ceil(h / cell);
  const start = performance.now();
  const duration = 780;
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

  // If rAF never runs — a background tab, a throttled iframe, a browser that
  // suspends animation frames — the plate must still appear. The lock is set
  // here, not up front, so a stalled animation cannot leave a blank plate.
  setTimeout(finish, duration + 400);
}

/* -------------------------------------------------------------------------- */
/* barcode                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A decorative Code-39-ish strip. Reads `width`/`height` attributes first, so
 * the canvas element must carry them or it renders at zero size.
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
  ctx.fillStyle = '#f6f3eb';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#151513';

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

/* -------------------------------------------------------------------------- */
/* skin furniture                                                              */
/* -------------------------------------------------------------------------- */

function initBarcodes() {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-barcode]').forEach(barcode);
}

function initGrid() {
  const overlay = document.getElementById('gridov');
  const cols = document.getElementById('gridcols');
  if (!overlay || !cols) return;

  if (!cols.childElementCount) {
    for (let i = 0; i < 12; i++) cols.appendChild(document.createElement('i'));
  }

  const toggle = () => {
    document.body.classList.toggle('grid-on');
    sfx('ui');
  };

  document.getElementById('gridbtn')?.addEventListener('click', toggle);

  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    toggle();
  });
}

function initHud() {
  const hx = document.getElementById('hx');
  const hy = document.getElementById('hy');
  if (!hx || !hy) return;

  let queued = false;
  let lastX = 0;
  let lastY = 0;

  addEventListener(
    'pointermove',
    (e) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        hx.textContent = String(Math.round(lastX)).padStart(4, '0');
        hy.textContent = String(Math.round(scrollY + lastY)).padStart(4, '0');
        queued = false;
      });
    },
    { passive: true },
  );
}

function initPaperSound() {
  const hoverPaper = throttled(() => sfx('paper'), 220);
  const hoverGlass = throttled(() => sfx('ui'), 80);

  document.querySelectorAll('.plate').forEach((p) => p.addEventListener('pointerenter', hoverPaper));
  document.querySelectorAll('.redact').forEach((r) => r.addEventListener('pointerenter', () => sfx('scratch')));
  document.querySelectorAll('.sticker, .stamp').forEach((s) => s.addEventListener('click', () => sfx('stamp')));
  document.querySelectorAll('.ix-row').forEach((r) => r.addEventListener('pointerenter', () => sfx('step')));
  document.querySelectorAll('.tag, .masthead a').forEach((a) => a.addEventListener('pointerenter', hoverGlass));
}

/** Break the seal: the page's one ceremonial gesture. */
function unseal() {
  const overlay = document.getElementById('unseal');
  if (!overlay || overlay.classList.contains('off')) return;

  const seal = overlay.querySelector('.seal');
  seal?.classList.add('stamping');

  sfx('tear');
  setTimeout(() => sfx('stamp'), 240);
  setTimeout(() => sfx('paper'), 420);
  setTimeout(() => sfx('chime'), 520);

  setTimeout(() => {
    overlay.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;

    // Cover elements come up in sequence rather than all at once.
    document.querySelectorAll<HTMLElement>('.cover [data-rev]').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), i * 70);
    });

    setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>('.masthead [data-scramble], .cover [data-scramble]')
        .forEach((s) => scramble(s));
    }, 180);
  }, 300);
}

function initSeal() {
  const overlay = document.getElementById('unseal');
  if (!overlay) return;

  overlay.querySelector('.seal')?.addEventListener('click', unseal);

  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.body.classList.contains('locked')) {
        e.preventDefault();
        unseal();
      }
    }
  });

  // Safety net: if nobody interacts, the page must not stay locked forever.
  setTimeout(unseal, 25000);
}

function initToc() {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.toc a'));
  if (!links.length) return;

  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((t): t is HTMLElement => Boolean(t));

  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle('on', a.hash.slice(1) === e.target.id));
      }
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
  );

  targets.forEach((t) => io.observe(t));
}

/* -------------------------------------------------------------------------- */

function boot() {
  // This script is bundled once for the whole site, but it must only run when
  // *this* skin is the one the document is wearing. Otherwise both skins'
  // boot functions fight over the same elements.
  if (document.documentElement.dataset.skin !== 'rhine') return;

  // The inline boot script sets `.no-seal` before first paint for `?skip=1` and
  // for reduced-motion visitors, so the overlay was never shown. Treat that as
  // "already unsealed" and skip the ceremony entirely.
  const noSeal = document.documentElement.classList.contains('no-seal');
  const motion = enableMotion();

  initBarcodes();
  initGrid();
  initHud();
  initPaperSound();
  initToc();

  const sealed =
    !noSeal && !!document.getElementById('unseal') && document.body.classList.contains('locked');

  if (!motion) {
    document.getElementById('unseal')?.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;
    settleEverything((cv) => halftone(cv, { animate: false }));
  } else {
    initSeal();
    bootReveals(halftone);
    if (!sealed) {
      // No seal on this page: reveal immediately rather than on scroll.
      (window as any)._unsealed = true;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
