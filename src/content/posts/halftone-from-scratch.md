---
title: 'Halftone, from scratch'
titleCn: '网点'
description: 'A screen is just dots of varying radius on a fixed lattice. Rebuilding one in a canvas takes forty lines and teaches you why print looks the way it does.'
date: 2025-12-09
tags: ['design', 'canvas', 'print']
code: 'HT-0031'
---

A halftone screen converts a continuous tone into a binary one: ink or no ink, in
cells small enough that the eye integrates them back into a gradient. The whole
mechanism is a dot whose radius encodes how dark that spot should be.

## The formula

For a cell of size `c`, a local density `d` in 0..1, and a maximum dot radius:

```
r = min(c × 0.63, √d × c × 0.63)
```

The square root is the important part. Dot *area* scales with `r²`, so linear
density must map to a square-rooted radius or the midtones crush. Skip the sqrt
and your 50% grey comes out at 25% ink and the whole image goes pale.

```js
for (let ry = 0; ry < rows; ry++) {
  for (let cx = 0; cx < cols; cx++) {
    const d = sample(cx * cell, ry * cell);
    if (d <= 0.03) continue;          // pure paper: draw nothing
    const r = Math.min(cell * 0.63, Math.sqrt(d) * cell * 0.63);
    ctx.beginPath();
    ctx.arc(cx * cell + cell / 2, ry * cell + cell / 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

## Moiré, and the jitter that kills it

A perfectly regular lattice over a perfectly regular image produces interference
bands — moiré. The fix is to break the regularity by a fraction of a cell:

```js
const jx = (hash(cx * 1.7 + ry * 2.3) - 0.5) * 0.32 * cell;
const jy = (hash(cx * 2.9 + ry * 4.1) - 0.5) * 0.32 * cell;
```

Plus or minus 0.16 of a cell. Any less and the bands survive; any more and the
lattice reads as noise rather than as a screen.

### The accent dots

About six in a thousand cells get the accent colour instead of ink:

```js
const isAccent = hash(cx * 3.1 + ry * 5.7) > 0.994;
```

They are not random decoration. At the density they appear, they read as
registration error — the tiny drift you get when a spot colour plate is a hair off
on press. It is a defect, faithfully reproduced, and it is what makes the plate
look printed rather than generated.

## Developing

Draw the rows in sequence over ~780ms with an out-cubic curve and the plate looks
like it is coming up in a tray of developer. Draw them all at once and it is a
picture that appeared. The difference is entirely in the timing.

```js
const frame = (now) => {
  const p = clamp01((now - start) / 780);
  drawRows(Math.ceil(outCubic(p) * totalRows));
  if (p < 1) requestAnimationFrame(frame);
};
```

Two constraints I learned the hard way:

- **Cap the device pixel ratio at 2.** A 4× backing store on a large plate is
  millions of `arc()` calls and the frame budget disappears.
- **Draw once, then lock.** Repainting on resize costs a full re-raster and the
  screen shimmers as it goes. Set a flag on the element and never come back.

> A screen is a lie told at a resolution the eye cannot resolve. Print has been
> telling it for a hundred and forty years.
