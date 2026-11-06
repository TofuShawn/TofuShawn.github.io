---
title: 'A grid is a promise'
titleCn: '网格是一种承诺'
description: 'Twelve columns, a 70.67px module, and an 8px baseline: what a layout contract buys you, and what it costs.'
date: 2026-01-28
tags: ['design', 'typography', 'grids']
featured: true
code: 'GD-0092'
---

The first thing a grid does is take away options. That is not a side effect; it is
the product. Before the grid I made twelve decisions per page. After it I make
two: which columns, and what goes in them.

## The module

A 1180px measure, 56px margins, twelve columns, a 20px gutter. The arithmetic is
not round:

```
(1180 − 2×56 − 11×20) / 12 = 848 / 12 = 70.666…
```

Seventy point six six six. It never divides evenly, and it never will, and this is
the single most useful thing about the number. A module that does not divide
evenly cannot be faked by eye. Either the grid is right or the element is visibly
one or two pixels off, and you can see it from across the room.

### Baseline

Vertical rhythm runs on 8px. Every gap, every padding, every margin is a multiple.

<dl class="meta-rows">
  <div><dt>8</dt><dd>caption to rule</dd></div>
  <div><dt>16</dt><dd>paragraph to paragraph</dd></div>
  <div><dt>24</dt><dd>heading to body</dd></div>
  <div><dt>32</dt><dd>block to block</dd></div>
  <div><dt>56</dt><dd>section to section</dd></div>
</dl>

The body line-height is 1.98 on 13px, which is 25.74px — not a multiple of 8. The
documentation for this system says 24px and the stylesheet says 1.98, and the
stylesheet wins because I read the rendered page, not the doc. A strict baseline
is a means, not an end: what matters is that adjacent blocks land on the same
rhythm, not that every line box is divisible by eight.

## What the grid refuses

The grid will not let you center a thing and then also left-align its caption.
It will not let a figure be 60% of the measure. It will not let you introduce a
third type size between 17 and 27.

> Every constraint the grid imposes is a decision you no longer have to make
> twice, and a decision you no longer have to defend.

The cost is that the grid is bad at exceptions. A pull quote that wants to be
three columns wide in a five-column context has to be forced, and forcing it
leaves a scar in the CSS. I have four such scars. I know where each one is.

## The collapse

Below 900px the grid collapses to a single column, and every span class is
overridden with `!important`. This is inelegant and it is correct: at that width
the column count is not a design decision, it is a readability constraint, and
there is exactly one right answer.

```css
@media (max-width: 900px) {
  .g { grid-template-columns: 1fr; }
  .g > * { grid-column: 1 / -1 !important; }
}
```

The `min-width: 0` on grid children is load-bearing and easy to forget. Without
it a long unbroken string — a URL, a serial number, a base64 blob — refuses to
shrink, blows out its `1fr` track, and pushes the whole grid sideways. You will
not notice until you paste a long token into a post.

## On the promise

A grid is a promise to the reader that the same kind of thing will always look
the same way. The index rows look like index rows. The folio is always bottom
right. The running head always has a number, a title, and a Latin gloss.

Promises are cheap to make and expensive to keep. The reason to keep them is that
the reader stops having to re-learn the page every time they arrive, and that
attention is what you actually wanted.
