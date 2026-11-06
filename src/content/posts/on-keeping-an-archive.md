---
title: 'On keeping an archive'
titleCn: '论归档'
description: 'Why a personal site should behave like a bound volume rather than a feed: numbering, fixity, and the discipline of not rewriting the past.'
date: 2026-02-14
updated: 2026-03-02
tags: ['writing', 'archives', 'design']
featured: true
code: 'OA-0417'
---

An archive is not a pile. The difference is that a pile grows and an archive
accumulates — one has no shape, the other has a rule about what may be added and
where it goes.

I have kept this site in one form or another for eleven years. The versions I
regret are the ones I rebuilt to look current. The versions that survived are the
ones where I only ever added.

## The numbering problem

Every entry here carries a code. It is not decorative. A code makes an entry
referenceable from outside itself: I can write a footnote that says *see OA-0417*
and the footnote will still resolve in ten years, because the code is bound to the
file and not to the URL.

The codes are assigned in the order entries are written, not the order they are
published. This means a code can appear out of sequence, which looks like a bug
and is actually the point: the code records *when I thought of it*.

Feeds have no such property. A feed is an ordering, not an identity — the same
post appears at position 1 and then position 400 and then nowhere. You cannot
cite a feed. You can only cite a moment in it.

> A blog post with no stable address is a remark, not a record.

## Fixity

The second rule is that published entries do not change. I add a revision line
at the foot when I am wrong, and I leave the wrong sentence standing above it.
This is uncomfortable and it is the entire value of the exercise.

<dl class="meta-rows">
  <div><dt>Rule 01</dt><dd>Add, do not rewrite</dd></div>
  <div><dt>Rule 02</dt><dd>Number everything citable</dd></div>
  <div><dt>Rule 03</dt><dd>Date the revision, not the entry</dd></div>
</dl>

### What this costs

It costs speed. A feed rewards the reflex; an archive punishes it. Every entry
here has been read twice before it goes up, and about a third of what I start
never arrives.

That ratio is the point. If everything I wrote got published, the archive would
be a pile again.

## On the typography of records

Paper is a good model because paper cannot reflow. A page is a fixed area and the
text has to fit it, which forces the writer to make decisions about hierarchy that
a scrolling column lets them defer forever.

The grid here is twelve columns on a 1180px measure with a 56px margin and a 20px
gutter. That leaves each column at 70.67px, and every vertical gap is a multiple
of 8. The constraint is not aesthetic. It is a way of making the layout answer
questions I would otherwise leave to instinct.

```ts
// A rule I keep coming back to: identity is not location.
type Entry = {
  code: string;   // stable, assigned once
  slug: string;   // may change if the title changes
  date: string;   // first publication
  revised?: string;
};
```

The code is the identity. The slug is a convenience. If I rename an entry, the
slug moves and the code does not, and any old link that used the code still works
because codes resolve through a lookup rather than through the path.

## What I would tell someone starting

Three things, in order of how much they matter:

1. Number your entries before you have enough of them to need numbering.
2. Never delete. Mark superseded and link forward.
3. Pick a typeface you can live with for a decade. You will.

The rest — the motion, the sound, the seal — is furniture. It is nice furniture,
and I spent an unreasonable amount of time on it, but it is not the archive. The
archive is the numbering and the refusal to rewrite.

<aside class="sidenote">
  <b>注 01</b> The seal on the cover is not a loading screen. It is a small
  ceremony that costs one click and buys the reader a moment of attention.
</aside>
