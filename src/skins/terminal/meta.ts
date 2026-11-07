import type { SkinMeta } from '../contract';

/**
 * Terminal — the dark, industrial skin.
 *
 * The first dark skin in the set: ground `#191919`, panel `#222222`, ink
 * `#EDEDED`, and exactly one signal colour, Endfield yellow `#FFFA00`.
 *
 * Three rules from the reference system are load-bearing here and are worth
 * naming because they pull against how the paper skins work:
 *
 *   - The accent is a *fill*, never a line or a word on the ground. Yellow on
 *     `#191919` is 15.9:1, but a 1px yellow rule reads as a highlight, so any
 *     line that carries meaning uses it and every line that is only a separator
 *     uses `--rule` grey.
 *   - A cut corner means "this is pressable". Body copy, figures and panels stay
 *     square, so shape alone separates a control from a container.
 *   - Latin labels are wide (Saira, `font-stretch: 125%`), uppercase and above
 *     the Chinese, which stays a clean sans at normal width. Numbers are
 *     tabular so a counting readout does not jitter.
 *
 * The `.t-micro` and field labels therefore stretch; `.t-body` never does.
 */
const terminal: SkinMeta = {
  id: 'terminal',
  name: 'Terminal',
  tagline: 'Industrial console, dark',
  scheme: 'dark',
  themeColor: '#191919',
  swatch: '#fffa00',
  features: {
    unseal: true,
    halftone: true,
    scanline: false,
    gridOverlay: true,
    hud: false,
    printArtifacts: false,
    barcode: true,
    columnRules: true,
    crt: false,
    marquee: true,
    destijl: false,
    punchcard: false,
    morse: false,
  },
};

export default terminal;
