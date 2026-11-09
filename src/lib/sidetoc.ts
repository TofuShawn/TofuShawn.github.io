/**
 * Side section rail — behaviour.
 *
 * The rail is a plain list of anchors, so it works with no script at all. This
 * module adds the two things CSS cannot know: which section you are actually
 * reading, and how far down the article that is.
 *
 * Two rules shape the implementation:
 *
 *  1. Scroll position is the only truth. The rail needs the *last heading above
 *     the fold*, which is a question about order, not about intersection — and
 *     the same question has to be answerable when the reader jumps straight to
 *     `#some-section` from a shared link. An IntersectionObserver is used only
 *     as a wake-up call for hosts that deliver no scroll event at all; the
 *     answer always comes from measuring.
 *  2. Nothing is mandatory. If the headings are missing, the rail hides
 *     itself; if the reader prefers reduced motion, CSS drops the tick
 *     transition and keeps the marker.
 */

/** Height of the chrome above the article, when that chrome is pinned. */
function chromeTop(): number {
  let top = 0;
  for (const el of Array.from(
    document.querySelectorAll<HTMLElement>('.ticker, .masthead'),
  )) {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    top = Math.max(top, r.bottom);
  }
  return top;
}

export function initSideToc(): void {
  const nav = document.querySelector<HTMLElement>('[data-sidetoc]');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('.sd-item'));
  if (links.length < 2) {
    nav.hidden = true;
    return;
  }

  const targets = links
    .map((a) => {
      const id = a.dataset.sdId || (a.getAttribute('href') || '').slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { link: a, el } : null;
    })
    .filter((x): x is { link: HTMLAnchorElement; el: HTMLElement } => x !== null);

  if (targets.length < 2) {
    nav.hidden = true;
    return;
  }

  const now = nav.querySelector<HTMLElement>('[data-sd-now]');
  const textOf = (a: HTMLAnchorElement) =>
    (a.querySelector('.sd-txt')?.textContent || '').trim();

  let active = -1;
  let queued = 0;
  let fallback = 0;

  const paint = () => {
    queued = 0;
    if (fallback) {
      clearTimeout(fallback);
      fallback = 0;
    }

    // The reading line sits just under the pinned chrome, far enough down that
    // a section counts as "current" once its heading has settled into view.
    const edge = chromeTop() + Math.min(140, innerHeight * 0.22);

    let next = -1;
    for (let i = 0; i < targets.length; i++) {
      if (targets[i].el.getBoundingClientRect().top <= edge) next = i;
      else break;
    }

    // Before the first heading has reached the line, the first section is
    // still the one you are looking at.
    if (next < 0) next = 0;

    // ...and once the article bottom is on screen, the last section wins, so
    // the rail does not sit one item behind at the end of the piece.
    const doc = document.documentElement;
    if (innerHeight + scrollY >= doc.scrollHeight - 4) next = targets.length - 1;

    if (next !== active) {
      if (active >= 0) {
        targets[active].link.classList.remove('on');
        targets[active].link.removeAttribute('aria-current');
      }
      targets[next].link.classList.add('on');
      targets[next].link.setAttribute('aria-current', 'true');
      active = next;
      nav.dataset.at = String(next);
      if (now) now.textContent = textOf(targets[next].link);
    }

  };

  const queue = () => {
    if (queued) return;
    queued = requestAnimationFrame(paint);
    // rAF is paused in background tabs and in some headless hosts, so the
    // marker would freeze mid-article. A timer keeps it honest; whichever
    // fires first clears the other.
    fallback = window.setTimeout(() => {
      if (queued) cancelAnimationFrame(queued);
      paint();
    }, 120);
  };

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });

  // Some hosts scroll the document element itself and the event never reaches
  // the window listener above; a capture listener on the document catches both.
  document.addEventListener('scroll', queue, { passive: true, capture: true });

  // Belt and braces: an observer on the headings themselves fires whenever one
  // crosses the reading line, whether or not a scroll event was delivered at
  // all (programmatic jumps, restored positions, hosts that swallow the event).
  if (typeof IntersectionObserver === 'function') {
    const io = new IntersectionObserver(queue, {
      rootMargin: '-12% 0px -72% 0px',
      threshold: [0, 1],
    });
    for (const t of targets) io.observe(t.el);
  }

  // Anchors jump; the marker has to follow the jump, not the smooth scroll.
  addEventListener('hashchange', queue);

  // Late fonts and images move the headings down the page.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);

  paint();

  // A reader who arrives on a deep link starts mid-article; the browser may
  // still be restoring that position when the first paint runs.
  addEventListener('load', queue, { once: true });

  // ...and on a cold load the browser often jumps while the page is still
  // short — before the stylesheet and the webfonts have grown the column above
  // the heading — lands back at 0 and never retries. Re-apply the fragment
  // once the layout has settled, but only if the reader has not scrolled yet.
  const settleHash = () => {
    if (!location.hash || window.scrollY > 0) return;
    let el: HTMLElement | null = null;
    try {
      el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    } catch {
      el = null;
    }
    if (!el) return;
    // `html { scroll-behavior: smooth }` turns every anchor jump into an
    // animation, and an interrupted animation is simply cancelled — on a cold
    // load that cancels the fragment jump itself. Land it directly instead;
    // the CSS still supplies scroll-margin-top for the pinned chrome.
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    el.scrollIntoView();
    root.style.scrollBehavior = previous;
    queue();
  };
  addEventListener('load', () => window.setTimeout(settleHash, 0), { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => window.setTimeout(settleHash, 80));
  }
}
