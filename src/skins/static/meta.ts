/**
 * Static — a specification sheet.
 *
 * The one skin with no script, and the one skin that is a *document* rather
 * than a printed object with an apparatus. A standards body's edition: front
 * matter, a control table, numbered clauses with a numbering gutter, a ruled
 * register for the index and tags, and notes filed at the foot of the sheet.
 *
 * Where `press` identifies itself with a wide display face and `paper` with
 * serif and rules, this skin identifies itself with *numbering and tables*. The
 * type scale is almost flat (cover 26–32px, body 15px), there are two weights
 * (400 read, 600 label), and the only colour is document blue used for the
 * revision field, clause numbers and links.
 *
 * It ships no `Chrome.astro` and no `client.ts` on purpose. Nothing in this
 * design depends on either: the reveal system is switched off without
 * `js-motion`, the ceremony overlay is CSS-hidden, and the clause rail is
 * wired by the shell in `BaseLayout` rather than by the skin.
 */
import type { SkinMeta } from '../contract';

const meta: SkinMeta = {
  id: 'static',
  name: 'Static',
  tagline: 'Controlled document, clause by clause',
  scheme: 'light',
  themeColor: '#eef0f2',
  swatch: '#24445c',
  features: {
    unseal: false,
    halftone: false,
    scanline: false,
    hud: false,
    printArtifacts: false,
    barcode: false,
    columnRules: false,
    crt: false,
    marquee: false,
    destijl: false,
    punchcard: false,
    morse: false,
  },
};

export default meta;
