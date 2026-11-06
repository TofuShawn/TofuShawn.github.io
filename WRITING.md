# Writing

How to add a post in a form the site will actually render well.

This repository is a **template**. It ships with five sample posts so that a
fresh clone has something to display, but they are demonstration content, not
anyone's archive — delete them. The rules below fall into two groups, and the
difference matters:

- **Structural rules are requirements.** Heading depth, required frontmatter,
  the fenced-code language tag, the note/entry distinction: the layouts were
  built around these, and a post that ignores them will look wrong even though
  it builds.
- **The voice section is an example, not a requirement.** It describes how the
  sample posts happen to read, as a worked illustration of one coherent
  editorial stance. Your own blog should not sound like it. If you are
  replacing the samples with your own writing, keep the structure and discard
  the voice entirely.

For the mechanical field list, see the frontmatter table below. For the demo
voice, see [Voice](#voice-the-sample-content).

---

## The two modes

Every post is one of two shapes, and the shape is a decision you make before you
start writing.

### Note — under ~400 words, no headings

A note is a remark with a date attached. It has no `##` sections, no argument to
build, and no conclusion. It is allowed to be one idea.

```
four-notes-on-silence.md   179 words, 0 headings
```

Notes exist because the alternative is not writing them. A site whose smallest
possible post is 800 words ends up with four posts a year.

Use a note when the thought does not survive expansion — when padding it to
1200 words would make it worse rather than better.

### Entry — 400–900 words, 2–5 `##` sections

The default. One claim, developed, then stopped. It does not need an
introduction or a summary; the first paragraph carries the claim and the last
paragraph lands it.

```
twelve-columns-one-accent.md      358 words, 4 headings
halftone-from-scratch.md          570 words, 4 headings
a-grid-is-a-promise.md            605 words, 5 headings
on-keeping-an-archive.md          694 words, 5 headings
```

A word count is not an ambition. The longest entry here is 694 words. If a post
is heading past 1000, it is probably two posts.

---

## Frontmatter

Three fields are required and the build fails without them.

```yaml
---
title: 'Twelve columns, one accent'
description: 'One line for the index and RSS.'
date: 2025-11-20
---
```

| Field | Required | What it does |
| --- | --- | --- |
| `title` | yes | Set in the display size. Sentence case, no trailing period. |
| `description` | yes | One sentence. Shows in listings, RSS, and `<meta>`. |
| `date` | yes | `YYYY-MM-DD`. Drives sorting, year grouping, and the stamp. |
| `titleCn` | no | Shown under the Latin title where the layout allows. |
| `updated` | no | Shows in the article footer only when present. |
| `tags` | no | Array. Drives `/tags/` and the related lists. Use the existing vocabulary. |
| `featured` | no | Pins to the top of its own list. Does **not** override chronological order in the archive. |
| `draft` | no | `true` builds the page but hides it from every list, RSS, and the sitemap. |
| `code` | no | The short code in the index list. Falls back to the first 8 characters of the slug, uppercased. |
| `lang` | no | Sets `lang` on `<article>`, for a post written in another language. |

**Why the quotes matter.** `title: Halftone, from scratch` is invalid YAML — the
comma starts a flow sequence. Quote every title and description. The build error
names the field, so you will find out, but it is a wasted cycle.

### `code` — the prefix convention

The code is what the ledger calls the post: printed in the index list, in the
running head, and in the citation block. Format is `XX-0000`.

Existing prefixes, by tag:

| Prefix | Tag | Example |
| --- | --- | --- |
| `GD` | grids | `GD-0092` |
| `CL` | colour | `CL-0018` |
| `HT` | print | `HT-0031` |
| `OA` | archives | `OA-0417` |
| `NT` | notes | `NT-0004` |

Invent a new prefix only for a genuinely new subject. The number is a serial, not
a date — it does not need to increase, and reusing a retired number is fine.
Leaving `code` out is also fine: the slug fallback is ugly on purpose, which is
a gentle nudge to set one.

### `tags` — start from the sample vocabulary

The five sample posts use nine tags. A new clone can start there, because an
empty `/tags/` page looks broken, and a tag vocabulary you did not choose is
still better than a page with nothing on it.

```
design (4)   writing (2)   typography (2)   print (2)   grids (2)
archives (2) notes (1)     colour (1)       canvas (1)
```

**These are not binding.** Once you are writing your own archive, replace them
wholesale — the vocabulary should describe your subjects, not this template's.
`/tags/` is a ruled register where every tag takes a row, so keep the final list
to something a reader can scan: roughly five to twelve tags, and a tag that
holds one post for a long time is a label rather than a category. Merge it into
a neighbour or fold it back into the post.

Whatever you settle on: lowercase, one word where possible, no plurals.

---

## Voice (the sample content)

**This section describes the sample posts, not a rule.** It is here because the
five demonstration posts do share a recognisable editorial stance, and a new
owner has to decide *something* about their own prose. Seeing one worked
example makes that decision easier, and copying it wholesale is the wrong
response to it.

If you keep the samples, they read consistently. If you are writing your own
archive, ignore everything below except the last paragraph.

Six properties, all visible in the five posts that ship:

**Start with a claim, not a context.** The first sentence is the argument:

> A single accent colour fails when it is used as decoration, because
> decoration scales with content and the accent does not.

No "In this post I will…", no "Recently I have been thinking about…".

**State the number.** These posts are about craft, and craft has measurements:

> Seventy point six six six. It never divides evenly, and it never will, and
> this is the single most useful thing about the number.

**Let the second sentence do the work the first one set up.** Short sentences
after long ones. The rhythm is a print rhythm, not a blog rhythm.

**Concede the counter-argument in the middle, not the end.** A post that only
proves its thesis reads as advocacy. The strongest samples argue against
themselves for a paragraph and then come back.

**End without a summary.** The last line is a fact, an aphorism, or an image —
never "in conclusion". Compare:

> The fiction is allowed one exception. The layout is not.

**No listicle voice.** If three things are true, write three paragraphs about
why they are true, not a bolded list. The one exception is a `<dl class="meta-rows">`
(see [Structured blocks](#structured-blocks)), which is a table wearing prose
clothes.

### What is transferable, whatever your voice

Almost nothing above. Two things are:

- **Do not announce the structure.** "First I'll cover, then I'll argue" is a
  presentational habit, not a voice, and it wastes the opening.
- **Do not end by summarising what you just said.** The reader finished the
  post; they were there. A summary is a tell that the piece had no ending.

Everything else — the measurements, the concessions, the aphorisms — belongs to
whoever wrote these samples.

### What to avoid

- Em-dash-heavy sentence joining as a substitute for structure. One per
  paragraph is already a lot.
- "It's worth noting", "at the end of the day", "let's dive in".
- Announcing the structure ("First, I'll cover…").
- Rhetorical questions as section openers.
- Anything that reads like it was written to fill a word count.

---

## Markdown support

Standard Markdown plus inline HTML, which is enabled deliberately — the print
furniture below only exists as raw HTML.

### Supported

| Syntax | Rendering |
| --- | --- |
| `## Heading` / `### Heading` | Section head, auto-numbered in the TOC. `####` and deeper are ignored by the TOC — do not use them. |
| `**bold**` | Ink weight. Used for the lead-in of a paragraph. |
| `*italic*` | Contrast emphasis. Reserved for single words. |
| `` `code` `` | Inline, monospace, tinted ground. |
| ` ```lang ` | Fenced block, syntax-highlighted. Needs a language tag. |
| `> quote` | Indented with a rule. Used for the one line you want remembered. |
| `- item` / `1. item` | List with printed markers. |
| `---` | A rule. Use sparingly — sections already have rules. |
| `[text](url)` | Underlined, colour on hover only, never colour at rest. |
| `![alt](src)` | Image inside prose. Prefer a `<Plate>` (below). |
| Tables | Rendered, but prefer `<dl class="meta-rows">` for label/value pairs. |

### Fenced code needs a language

` ```css ` not ` ``` `. Without it Shiki cannot pick tokens and the block renders
unhighlighted. Available: `css`, `html`, `js`, `ts`, `json`, `yaml`, `bash`,
`md`, `astro`.

Note the themes: code blocks are rendered **dark on paper** in both skins, which
is deliberate — a code block is a photographic plate, not a text block. Do not
try to make it match the page.

---

## Structured blocks

These are raw HTML in the Markdown. They are styled by both skins, so they work
in either theme — that is the whole point of putting them in base structure
rather than a skin.

### `<dl class="meta-rows">` — a label/value table

The workhorse. Anywhere you would write "X: Y" five times.

```html
<dl class="meta-rows">
  <div><dt>Section numbers</dt><dd>yes — they are navigation</dd></div>
  <div><dt>Figure tags</dt><dd>yes — they are citations</dd></div>
  <div><dt>Links</dt><dd>underline only, colour on hover</dd></div>
</dl>
```

Each row is a `<div>` wrapping a `<dt>`/`<dd>` pair. The `div` is required —
without it the grid has nothing to lay out. Values are short; this is not a
table for prose.

### `<div class="sidenote">` — a margin note

```html
<div class="sidenote">
  <p><b>Note</b></p>
  <p>A remark that would interrupt the paragraph it belongs to.</p>
</div>
```

Rendered in the margin on wide screens, inline on narrow ones. One or two per
post; they lose their function if they are every other paragraph.

### `<Plate>` — a figure

Import it, do not hand-write the markup:

```astro
import Plate from '../../components/Plate.astro';

<Plate variant="orbit" ratio="1 / 1" tag="FIG.01" caption="Orbit — specimen plate" />
```

`variant` is `orbit` | `wave` | `noise` | `figure` | `grid`. It is painted
procedurally, in the active skin's palette, so it is correct in both themes and
weighs nothing. Pass `src`/`alt` only for a real image.

**Markdown files cannot use it** — `<Plate>` is an Astro component, and `.md`
does not compile components. If you want a figure inside a post you have two
options: the article template's automatic `FIG.01` (shown when the body contains
a fenced code block), or converting the post to `.mdx`. Adding MDX is a
dependency decision, not a writing decision — ask before doing it.

### `<div class="figcap">` — a figure caption

Only meaningful under a figure. Uses `<b>` for the tag and a `<span>` for the
text.

---

## Workflow

### The fast loop

```bash
npm run dev          # http://localhost:4321/
```

Create the file, save, and the page updates in place. A new post appears in
`/posts/` within a few seconds. No restart, no rebuild step.

### When frontmatter is wrong

The dev server returns a 500 and the build stops, both naming the field:

```
Post "my-post" has invalid frontmatter:
  - date: Invalid input
```

If you see this in `npm run dev`, the page you were looking at is now an error
page — fix the frontmatter and it recovers without a restart.

### Before publishing

```bash
npm run verify       # build + routes + furniture + metadata
```

`npm run verify` is the gate. It checks that every route serves a real document
and that the furniture each skin advertises is present. It will not catch a
typo in prose, but it will catch a post that builds to an empty page.

---

## For an AI writing a post

Point the agent at this file. **First establish which of the two jobs it is**, because
they have opposite instructions:

### Job A — improving the template's sample content

The five posts exist so a clone is not an empty shell. An agent working here
should keep them *about the template's own subject*: layout, print, typography,
archive-keeping — the things the site is demonstrably built from. The writing
must remain generic enough to be replaceable, and must not invent an author
persona, a personal history, or opinions that would commit a new owner to
anything.

Rules for job A:

1. **Pick the mode first.** Under 400 words with no headings is a note and is
   complete. Do not pad it.
2. **Required frontmatter is exactly three fields:** `title`, `description`,
   `date`. Quote the first two.
3. **Stay in the sample tag vocabulary** (`design`, `writing`, `typography`,
   `print`, `grids`, `archives`, `notes`, `colour`, `canvas`), because `/tags/`
   must look populated on a fresh clone.
4. **Set `code`** with a prefix matching the primary tag from the table above.
5. **`##` and `###` only.** Deeper headings vanish from the TOC.
6. **Fenced code blocks need a language tag.**
7. **Do not invent frontmatter fields.** The Zod schema is strict; unknown keys
   are stripped silently rather than reported.

### Job B — writing someone's actual posts

Everything about voice is theirs, not yours. Do not import the sample voice, do
not add the measurements-and-concessions rhythm from the section above, and do
not "make it consistent with the existing posts" — the existing posts are demo
material that the owner is replacing.

Rules for job B:

1. **Ask for the voice before writing.** Or better, ask for one paragraph they
   have already written and match that.
2. **Structure still applies** — modes, frontmatter, heading depth, language
   tags, no invented fields. Those are layout constraints, not style choices.
3. **Tags are the owner's choice.** The sample vocabulary is a placeholder. Confirm
   which tags exist in *their* archive before assigning any.
4. **Do not rewrite their other posts for consistency.** That is the single most
   damaging thing an agent does to someone's archive.

### For both jobs

What an agent should *not* do: add a "related posts" section, change the prose
style of posts it was not asked to touch, or delete the sample posts unless
explicitly told to — the samples are the working example that makes the
template legible to a new owner.
