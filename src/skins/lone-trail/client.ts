/**
 * Lone Trail — the client layer.
 *
 * Progressive, like every skin: without JavaScript the site is a complete
 * document. This file adds the console behaviour — scanline sphere plates, the
 * launch overlay, the telemetry marquee, the punch-card matrix, morse readouts,
 * the CRT beam and the grid overlay.
 *
 * The generic primitives (easing, hash, scramble, odometer, the reveal
 * observer) come from `src/lib/motion.ts`, shared with the other skins.
 */
import {
  bootReveals,
  clamp01,
  dpr,
  enableMotion,
  hash,
  onEnter,
  reduceMotion,
  scramble,
  settleEverything,
  throttled,
} from '../../lib/motion';
import { initRail } from '../../lib/rail';

/* -------------------------------------------------------------------------- */
/* scanline sphere — the plate painter for this skin                          */
/* -------------------------------------------------------------------------- */

/** The reference's drawing, restated in skin tokens. See DESIGN.md for the math. */
export function scanlineSphere(cv: HTMLCanvasElement): void {
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

  const paper = '#faf8f5';
  const ink = '#161618';
  const accent = '#e9521c';
  const faint = 'rgba(22, 22, 24, 0.16)';

  const cx = w / 2;
  const cy = h / 2;
  const planetR = Math.min(w, h) * 0.25;
  const scanlines = 14;
  const tiltDeg = -24;
  const tiltRad = (tiltDeg * Math.PI) / 180;

  const paint = (phase: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);

    // Crosshair under everything: this is a measuring instrument.
    ctx.strokeStyle = faint;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();

    // Outer dashed measurement ring.
    ctx.strokeStyle = ink;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, planetR * 1.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // The sphere: horizontal scanlines whose weight grows toward the bottom,
    // with one accent band in the lower third. Clipped to the disc.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
    ctx.clip();

    const step = (planetR * 2) / scanlines;
    const phaseOffset = (phase * 12) % step;
    for (let i = -1; i <= scanlines + 1; i++) {
      const y = cy - planetR + i * step + phaseOffset;
      const ny = (y - (cy - planetR)) / (planetR * 2);
      if (ny < 0 || ny > 1) continue;
      ctx.strokeStyle = ny > 0.58 && ny < 0.75 ? accent : ink;
      ctx.lineWidth = 0.8 + Math.pow(ny, 1.5) * 5.2;
      ctx.beginPath();
      ctx.moveTo(cx - planetR, y);
      ctx.lineTo(cx + planetR, y);
      ctx.stroke();
    }
    ctx.restore();

    // Disc boundary.
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, planetR, 0, Math.PI * 2);
    ctx.stroke();

    // Tilted orbital ring and its satellite.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tiltRad);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, planetR * 1.85, planetR * 0.52, 0, 0, Math.PI * 2);
    ctx.stroke();

    const satX = Math.cos(phase) * planetR * 1.85;
    const satY = Math.sin(phase) * planetR * 0.52;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(satX, satY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(satX, satY, 9.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Counter-rotating polar telemetry ring.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-tiltRad * 1.3 + phase * 0.25);
    ctx.strokeStyle = 'rgba(29, 86, 158, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(0, 0, planetR * 1.55, planetR * 0.85, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  };

  // Static frame when motion is not wanted. One paint, then lock — a plate that
  // animates forever is a battery drain and a distraction while reading.
  if (reduceMotion()) {
    paint(0);
    cv.dataset.drawn = '1';
    return;
  }

  let phase = 0;
  let raf = 0;
  let running = true;

  const frame = () => {
    if (!running) return;
    paint(phase);
    phase += 0.012;
    raf = requestAnimationFrame(frame);
  };

  // Only animate while visible. A plate scrolled past should stop costing frames.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!e.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      }
    },
    { threshold: 0.05 },
  );

  paint(0);
  cv.dataset.drawn = '1';
  io.observe(cv);
  raf = requestAnimationFrame(frame);
}

/* -------------------------------------------------------------------------- */
/* morse                                                                      */
/* -------------------------------------------------------------------------- */

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
};

export function toMorse(text: string): string {
  return text
    .toUpperCase()
    .split('')
    .map((ch) => (ch === ' ' ? '/' : (MORSE[ch] ?? '')))
    .filter(Boolean)
    .join(' ');
}

function initMorse() {
  document.querySelectorAll<HTMLElement>('[data-morse]').forEach((el) => {
    const text = el.dataset.morse ?? '';
    if (!text) return;
    el.textContent = toMorse(text);
  });
}

/* -------------------------------------------------------------------------- */
/* punch card                                                                 */
/* -------------------------------------------------------------------------- */

const PUNCH_ROWS = 7;

/** Encode a character as a 7-bit punch column. Deterministic, so it is stable. */
function bitsFor(ch: string, index: number): boolean[] {
  const code = ch === ' ' ? 0 : ch.toUpperCase().charCodeAt(0);
  const mixed = (code * 2654435761 + index * 40503) >>> 0;
  return Array.from({ length: PUNCH_ROWS }, (_, r) => ((mixed >> r) & 1) === 1);
}

function initPunch() {
  const host = document.getElementById('punch');
  if (!host) return;

  const input = host.querySelector<HTMLInputElement>('#punch-input');
  const readout = host.querySelector<HTMLElement>('#punch-count');
  const morseOut = host.querySelector<HTMLElement>('#punch-morse');
  const matrix = host.querySelector<HTMLElement>('#punch-matrix');
  if (!input || !matrix) return;

  const maxChars = 12;

  const render = () => {
    const text = (input.value || 'LONE TRAIL').slice(0, maxChars);
    const cols = text.split('').map((ch, i) => ({ ch, bits: bitsFor(ch, i) }));

    let total = 0;
    matrix.innerHTML = cols
      .map((col, cIdx) => {
        const dots = col.bits
          .map((bit, rIdx) => {
            if (bit) total++;
            return `<button type="button" class="punch-dot${bit ? ' on' : ''}"
              data-c="${cIdx}" data-r="${rIdx}"
              aria-label="Column ${cIdx + 1} bit ${PUNCH_ROWS - rIdx}"
              aria-pressed="${bit}"></button>`;
          })
          .join('');
        return `<div class="punch-col">
            <span class="punch-ch">${col.ch === ' ' ? '␣' : col.ch}</span>
            <div class="punch-bits">${dots}</div>
            <span class="punch-idx">C${String(cIdx + 1).padStart(2, '0')}</span>
          </div>`;
      })
      .join('');

    if (readout) readout.textContent = `${total} / ${cols.length * PUNCH_ROWS} BITS`;
    if (morseOut) morseOut.textContent = toMorse(text) || '—';

    // Clicks flip a bit and re-render. Kept as a delegated listener so the
    // re-render cannot leak handlers.
    matrix.querySelectorAll<HTMLButtonElement>('.punch-dot').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('on');
        btn.setAttribute('aria-pressed', String(btn.classList.contains('on')));
        const on = matrix.querySelectorAll('.punch-dot.on').length;
        if (readout) readout.textContent = `${on} / ${cols.length * PUNCH_ROWS} BITS`;
      });
    });
  };

  input.addEventListener('input', throttled(render, 90));
  host.querySelectorAll<HTMLButtonElement>('[data-punch-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.punchPreset ?? '';
      render();
    });
  });

  render();
}

/* -------------------------------------------------------------------------- */
/* CRT + marquee + grid                                                       */
/* -------------------------------------------------------------------------- */

function initCrt() {
  // The scanline layer and the beam are CSS. JS does two things: stop the beam
  // when motion is reduced (a 7s sweep forever is exactly what the preference
  // is asking us not to do), and run the opt-out switch for the ambient layer.
  if (reduceMotion()) document.documentElement.classList.add('lt-still');

  const btn = document.getElementById('fxtoggle');
  const html = document.documentElement;
  if (!btn) return;

  const paint = () => {
    btn.setAttribute('aria-pressed', html.classList.contains('fx-off') ? 'false' : 'true');
  };
  paint();

  btn.addEventListener('click', () => {
    const off = html.classList.toggle('fx-off');
    try {
      localStorage.setItem('fx', off ? 'off' : 'on');
    } catch (e) {}
    // An explicit click outranks a pinned `?fx=` in the URL, or a later
    // navigation would silently undo the choice.
    try {
      const url = new URL(location.href);
      if (url.searchParams.has('fx')) {
        url.searchParams.delete('fx');
        history.replaceState(null, '', url.href);
      }
    } catch (e) {}
    paint();
  });

  // Keyboard escape hatch for the ambient layer, matching the grid's `G`.
  addEventListener('keydown', (e) => {
    if (e.key !== 's' && e.key !== 'S') return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    btn.click();
  });
}

/* -------------------------------------------------------------------------- */
/* Telemetry band — a news crawl                                             */
/* -------------------------------------------------------------------------- */

/**
 * One line, always travelling left, at a speed you can read.
 *
 * The speed is the whole point: the CSS animation it replaces ran for a fixed
 * 42s per cycle, so the crawl's pace was whatever `track width / 42` happened
 * to be — add a word to the ticker list and the whole band slows down. A crawl
 * is a reading pace, so the clock is px/s and the geometry is solved per frame.
 *
 * That is also why this is scripted at all: CSS can animate `translateX(-50%)`
 * on a timer, but it cannot say "84 pixels per second" — the duration depends
 * on the width, which depends on the copy. The CSS animation stays as the
 * no-JS baseline; `html.js-marquee` turns it off, because two things writing
 * translateX fight each other.
 *
 * Two details that matter:
 *   - the track holds two identical runs, so one cycle is half its width.
 *     Wrapping at `scrollWidth / 2` makes the seam invisible; wrapping at the
 *     full width would leave a gap.
 *   - the crawl pauses under the pointer, because a band that cannot be read
 *     while you aim at it is decoration rather than information.
 */
function initTicker() {
  const track = document.querySelector<HTMLElement>('.ticker-track');
  const band = track?.closest<HTMLElement>('.ticker');
  if (!track || !band) return;

  // Reduced motion, or the still switch: leave the static band alone.
  if (reduceMotion() || document.documentElement.classList.contains('lt-still')) return;

  document.documentElement.classList.add('js-marquee');

  // px/s, one constant for the whole band — that is the point of scripting it.
  // A broadcast crawl reads at roughly 70–110; above that the 12px caps stop
  // resolving, below it the band is wallpaper with a clock attached.
  const SPEED = 70;

  let width = track.scrollWidth / 2;

  // Start one run to the left rather than at zero. The band travels rightward
  // and wraps at `x >= 0` back to `-width`; those two positions are the same
  // picture (the second run stands where the first one was), so anchoring at
  // `-width` just means the first wrap is a full cycle away instead of the
  // very next frame.
  let x = -width;
  let last = performance.now();
  let paused = false;
  let hidden = document.hidden;

  band.addEventListener('pointerenter', () => (paused = true));
  band.addEventListener('pointerleave', () => (paused = false));

  // A band that keeps painting in a background tab is just wasted battery.
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
  });

  // Half the track is one run; recompute when the font or viewport changes it.
  const measure = () => {
    width = track.scrollWidth / 2;
  };
  addEventListener('resize', measure, { passive: true });
  if (document.fonts) document.fonts.ready.then(measure).catch(() => {});

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (hidden) {
      last = now;
      return;
    }

    // Cap dt so a stalled frame or a long tab wake cannot teleport the band.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!paused) x += SPEED * dt;

    // Travel is rightward only, so only the right seam ever needs wrapping:
    // one run of travel plus one run of content is the same picture again,
    // which is what makes `x = 0 → x = -width` invisible.
    if (width > 0 && x >= 0) x -= width;

    // translate3d keeps this on the compositor; translateX can be promoted too
    // but only when the property is not also being animated by CSS.
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  };

  requestAnimationFrame(frame);
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

/* -------------------------------------------------------------------------- */
/* launch ceremony                                                            */
/* -------------------------------------------------------------------------- */

function initLaunch() {
  const overlay = document.getElementById('lt-launch');
  if (!overlay) return;

  const count = document.getElementById('lt-count');
  const btn = overlay.querySelector<HTMLButtonElement>('.launch-btn');

  // A four-second countdown, then the button becomes the only way in. The
  // countdown is decoration: the page is never blocked on it.
  if (count && !reduceMotion()) {
    const start = performance.now();
    const dur = 4000;
    const frame = (now: number) => {
      const p = clamp01((now - start) / dur);
      const left = Math.max(0, dur * (1 - p)) / 1000;
      count.textContent = `00:0${Math.floor(left)}.${String(Math.floor((left % 1) * 100)).padStart(2, '0')}`;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  const enter = () => {
    if (overlay.classList.contains('off')) return;
    overlay.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;

    document.querySelectorAll<HTMLElement>('.cover [data-rev]').forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), i * 70);
    });
    setTimeout(() => {
      document
        .querySelectorAll<HTMLElement>('.masthead [data-scramble], .cover [data-scramble]')
        .forEach((s) => scramble(s));
    }, 200);
  };

  btn?.addEventListener('click', enter);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) enter();
  });

  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.body.classList.contains('locked')) {
        e.preventDefault();
        enter();
      }
    }
  });

  setTimeout(enter, 25000);
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
/* stagger — the page arrives, it does not appear                             */
/* -------------------------------------------------------------------------- */

/**
 * Groups whose children should arrive one after another. The CSS half of this
 * lives in the `motion` section of `skin.css` and only applies under
 * `.js-motion`.
 *
 * The delay index is capped: past ten rows the stagger would read as lag, and
 * a reader scrolling into a long list should see it settle, not queue.
 */
const STAGGER_GROUPS =
  '.ix-list, .tag-cloud, .meta-rows, .post-nav, .toc ol, .destijl, .stag-group';

const STAGGER_STEP = 46;
const STAGGER_DUR = 700;

/** Return a group to its resting state: no `data-stag`, no inline `--i`. */
function release(group: HTMLElement) {
  group.classList.remove('in');
  delete group.dataset.stag;
  Array.from(group.children).forEach((kid) =>
    (kid as HTMLElement).style.removeProperty('--i'),
  );
}

/**
 * Reveal `el` as soon as it is on screen: synchronously if it already is,
 * otherwise when it scrolls in.
 *
 * The synchronous branch matters. `IntersectionObserver` answers on the next
 * frame, and for content that is already painted at load that frame can be
 * late enough to see the element in its hidden state — a flicker the observer
 * cannot avoid. Anything intersecting at boot is therefore revealed here,
 * without waiting.
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

  /** Groups still waiting to play, with the callback that starts them. */
  const armed: Array<{ el: HTMLElement; fire: () => void }> = [];

  const groups = Array.from(
    document.querySelectorAll<HTMLElement>(STAGGER_GROUPS),
  ).filter((g) => g.children.length > 0);

  groups.forEach((group) => {
    const kids = Array.from(group.children) as HTMLElement[];

    // A group with no geometry can never intersect an observer — it sits in an
    // inactive skin wrapper, or is hidden by an ancestor. Staggering it would
    // hide it permanently, so it never gets `data-stag` and simply stays put.
    if (!group.getBoundingClientRect().height) return;

    group.dataset.stag = '';
    kids.forEach((kid, i) => kid.style.setProperty('--i', String(Math.min(i, 10))));

    const fire = () => {
      if (group.classList.contains('in')) return;
      group.classList.add('in');
      // Handing the children back to their own transitions once the group has
      // settled is what keeps `:hover` instant. Without this the hover rule
      // would keep inheriting the stagger's delay.
      const settle = Math.min(kids.length, 11) * STAGGER_STEP + STAGGER_DUR;
      setTimeout(() => release(group), settle);
    };

    armed.push({ el: group, fire });
    revealSeen(group, fire);
  });

  // The observer is the primary trigger, but a paused animation with `both`
  // fill leaves the content invisible if it never fires — a failure mode with
  // no visual symptom other than "the list is missing". This one passive
  // listener is the guarantee: anything that reaches the viewport by any
  // means (a scroll the observer missed, an anchor jump, a layout shift)
  // is started anyway, and the listener removes itself once nothing is armed.
  if (!armed.length) return;

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

function initHovers() {
  // Hover behaviours that are not sound belong here. Sound itself used to tick
  // on every row and sweep on every plate; the pointer crossing a page is not a
  // gesture that asked for anything.
}

/* -------------------------------------------------------------------------- */

function boot() {
  // This bundle ships for the whole site; it must only act when this skin is
  // the one the document is wearing, or both skins' boots fight each other.
  if (document.documentElement.dataset.skin !== 'lone-trail') return;

  const noSeal = document.documentElement.classList.contains('no-seal');
  const motion = enableMotion();

  initCrt();
  initGrid();
  initMorse();
  initPunch();
  initToc();
  initHovers();
  initStagger();
  initTicker();
  // Chrome, not an effect: mounted even under reduced motion, because the
  // native bar is hidden as soon as `js-rail` is set.
  initRail({ skin: 'lone-trail' });

  const sealed =
    !noSeal && !!document.getElementById('lt-launch') && document.body.classList.contains('locked');

  if (!motion) {
    document.getElementById('lt-launch')?.classList.add('off');
    document.body.classList.remove('locked');
    (window as any)._unsealed = true;
    settleEverything(scanlineSphere);
  } else {
    initLaunch();
    bootReveals(scanlineSphere);
    if (!sealed) (window as any)._unsealed = true;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
