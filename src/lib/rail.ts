/**
 * Scroll rail — the custom scrollbar each skin draws for itself.
 *
 * The native scrollbar is hidden only *after* this module mounts a replacement
 * (the `html.js-rail` class), so with JavaScript off every visitor still has a
 * working scrollbar. That direction matters: the naive version hides the
 * native bar in CSS and then asks a script to draw something better, which
 * leaves a page that cannot be scrolled with a mouse when the script fails.
 *
 * The rail is `aria-hidden` decoration, not a control: wheel, touch and
 * keyboard scrolling are untouched, and a scroll position readout is not
 * something a screen reader needs twice (the browser announces the position
 * for the real scroll area). Dragging is a pointer-only convenience.
 *
 * This module owns no geometry and no colour. It publishes three custom
 * properties, all unitless so a skin can mix them into `calc()` with any unit:
 *
 *   --rail-p   progress, 0..1
 *   --rail-h   viewport / document height, 0..1 — the thumb's share
 *   --rail-travel  the px distance the thumb may move
 *
 * and the skin decides where the rail sits and what it looks like.
 *
 * The rail also publishes `--rail-top`, the height of whatever chrome is
 * currently pinned to the top of the viewport, so the track starts below the
 * navigation instead of running through it.
 */

/**
 * Chrome that can sit on top of the page. Measured rather than assumed: the
 * skins differ — Lone Trail stacks a ticker band above a sticky masthead, press
 * has only a masthead and it scrolls away.
 */
const CHROME = ['.ticker', '.masthead'];

export interface RailOptions {
  /**
   * Skin id. Every skin's Chrome is emitted into every page inside a
   * `.skin-only[data-only]` wrapper, so an unscoped `[data-rail]` query would
   * find the hidden skin's rail first and animate the wrong element.
   */
  skin: string;
  /** Selector for the rail element, relative to the active skin wrapper. */
  selector?: string;
  /** Selector for the thumb inside it. Defaults to `[data-rail-thumb]`. */
  thumbSelector?: string;
  /** Selector for the percentage readout, searched inside the rail. */
  readoutSelector?: string;
}

export function initRail(opts: RailOptions): void {
  const scope = `.skin-only[data-only='${opts.skin}']`;
  const rail =
    document.querySelector<HTMLElement>(`${scope} ${opts.selector ?? '[data-rail]'}`) ??
    document.querySelector<HTMLElement>(opts.selector ?? '[data-rail]');
  if (!rail) return;

  const thumb =
    rail.querySelector<HTMLElement>(opts.thumbSelector ?? '[data-rail-thumb]') ??
    (rail.firstElementChild as HTMLElement | null);
  if (!thumb) return;

  const readout = rail.querySelector<HTMLElement>(opts.readoutSelector ?? '[data-rail-pct]');

  const root = document.documentElement;
  let lastPct = -1;

  // The rail is an instrument for the text, not part of the page's frame, so
  // it starts below whatever is currently pinned to the top of the viewport.
  // The chrome is not uniform across skins: Lone Trail stacks a ticker band
  // above a sticky masthead (only the masthead is still there once you scroll),
  // press's masthead scrolls away completely. So this measures the contiguous
  // stack that touches the top edge, in document order, and lets it dissolve as
  // the reader scrolls past it.
  const chromeTop = () => {
    // Array.from, not the NodeList itself: a NodeList has forEach but no
    // filter, and calling one makes the whole paint throw — which silently
    // leaves every custom property unset and the rail collapsed to nothing.
    const boxes = Array.from(document.querySelectorAll<HTMLElement>(CHROME.join(',')))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.height > 0 && r.bottom > 0)
      .sort((a, b) => a.top - b.top);

    let edge = 0;
    for (const r of boxes) {
      // Only a box that continues the stack counts. A sticky element parked
      // further down the page is scenery, not something the rail can pass
      // through, and counting it would push the rail off the page.
      if (r.top > edge + 4) break;
      edge = Math.max(edge, r.bottom);
    }
    return Math.max(0, Math.min(edge, window.innerHeight - 40));
  };

  // The thumb's own travel is read from the live layout rather than cached:
  // the thumb height changes as the document grows (fonts, images, a section
  // that expands on click), and a cached travel length makes a drag drift out
  // of sync with the pointer halfway down the page.
  const travel = () => {
    const h = rail!.getBoundingClientRect().height;
    return Math.max(1, h - thumb!.getBoundingClientRect().height);
  };

  const paint = () => {
    const doc = root.scrollHeight;
    const win = window.innerHeight;
    const max = Math.max(0, doc - win);
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    // Three unitless numbers, so a skin can use them in any `calc()`:
    //   --rail-p  progress 0..1
    //   --rail-h  thumb share of the track 0..1
    //   --rail-travel  the px distance the thumb may move
    rail!.style.setProperty('--rail-p', p.toFixed(4));
    rail!.style.setProperty('--rail-h', doc > 0 ? Math.min(1, win / doc).toFixed(4) : '1');
    rail!.style.setProperty('--rail-top', `${chromeTop()}px`);
    rail!.style.setProperty('--rail-travel', `${travel()}px`);

    // A page that fits in one screen has nothing to indicate. Rather than let
    // the skin paint a full-height thumb, mark it idle and let CSS drop it.
    rail!.classList.toggle('is-idle', max < 8);

    if (readout) {
      const pct = Math.round(p * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        readout.textContent = String(pct).padStart(3, '0');
      }
    }
  };

  // One paint per frame, no matter how many scroll events arrive.
  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      paint();
    });
  };

  // --- drag ---------------------------------------------------------------
  let dragging = false;
  let grab = 0;

  const scrollToPointer = (clientY: number, centerOnPointer: boolean) => {
    const top = rail!.getBoundingClientRect().top;
    const offset = centerOnPointer ? thumb!.getBoundingClientRect().height / 2 : grab;
    const p = Math.min(1, Math.max(0, (clientY - top - offset) / travel()));
    const max = Math.max(0, root.scrollHeight - window.innerHeight);
    window.scrollTo(0, p * max);
  };

  rail.addEventListener('pointerdown', (e) => {
    const onThumb = e.target === thumb || thumb!.contains(e.target as Node);
    grab = onThumb ? e.clientY - thumb!.getBoundingClientRect().top : 0;
    dragging = true;
    rail!.classList.add('is-drag');
    try {
      rail!.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; the window listeners below still work */
    }
    // Clicking the rail jumps; grabbing the thumb keeps the grab point under
    // the pointer, so the thumb does not leap to centre itself.
    if (!onThumb) scrollToPointer(e.clientY, true);
    e.preventDefault();
  });

  rail.addEventListener('pointermove', (e) => {
    if (dragging) scrollToPointer(e.clientY, false);
  });

  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    rail.classList.remove('is-drag');
    try {
      rail.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    paint();
  };

  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);

  // --- mount --------------------------------------------------------------
  root.classList.add('js-rail');
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  // Fonts land after first paint and change the document height.
  document.fonts?.ready.then(paint).catch(() => {});
  paint();
}
