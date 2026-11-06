---
title: 'Twelve columns, one accent'
titleCn: '十二栏，一个强调色'
description: 'A visual system with a single saturated colour only works if you are strict about how much of it the page is allowed to contain.'
date: 2025-11-20
tags: ['design', 'colour', 'typography', 'grids', 'print', 'archives']
code: 'CL-0018'
---

Warm grey paper, near-black ink, and one vermilion. That is the whole palette.
Everything else is a tint of one of those three, and the tints are derived rather
than picked.

## The accent budget

A single accent colour fails when it is used as decoration, because decoration
scales with content and the accent does not. So the accent gets a budget: roughly
three percent of the visible page, and every use has to earn its place.

<dl class="meta-rows">
  <div><dt>Section numbers</dt><dd>yes — they are navigation</dd></div>
  <div><dt>Figure tags</dt><dd>yes — they are citations</dd></div>
  <div><dt>Links</dt><dd>underline only, colour on hover</dd></div>
  <div><dt>Headings</dt><dd>never — the weight is enough</dd></div>
  <div><dt>Body text</dt><dd>never</dd></div>
</dl>

The result is that when something *is* vermilion, you look at it. That is the only
property a signal needs.

### Deriving the tints

The rule colours are the ink at 20% and 10% alpha, not separate hexes. This means
a rule is always in the same family as the text it separates, and it means there
are two numbers to change instead of six.

```css
--rule:      rgba(21, 21, 19, 0.20);
--rule-soft: rgba(21, 21, 19, 0.10);
--accent-soft: rgba(233, 82, 28, 0.14);
```

## Contrast

Vermilion `#e9521c` on paper `#f6f3eb` is 3.4:1. That is enough for large text and
for a rule, and not enough for body copy — which is why the accent never carries
body copy. Ink on paper is 15.8:1 and does the actual work.

> If your accent passes AA for body text, it is probably too dark to be an accent.

## One more constraint

The colour bar in the cover's metadata block contains five swatches, four of which
are not in the palette at all — process cyan, magenta, yellow, and black. That is
deliberate. It is a printer's colour control strip, and it belongs to the fiction
of the page rather than to the design system. The fiction is allowed one exception.
The layout is not.
