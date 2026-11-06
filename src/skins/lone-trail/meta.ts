import type { SkinMeta } from '../contract';

/**
 * Lone Trail — a control room printed on paper.
 *
 * Same foundation as the Rhine skin (Swiss 12-column grid, warm off-white
 * paper, near-black ink, exactly one saturated accent, mono micro-labels) and a
 * deliberately different medium: Rhine pretends to be a print dossier, this one
 * pretends to be a CRT console.
 *
 * What that changes, concretely:
 *   - the grid separates columns with **rules**, not whitespace
 *   - type is geometric, uppercase and much larger; tracking goes negative on
 *     display and wide on labels
 *   - furniture is telemetry (scanlines, a sweeping beam, a marquee, a
 *     punch-card matrix) instead of print artifacts (crop marks, fold, tape)
 *   - figures are scanline spheres instead of halftone screens
 *
 * The accent is `#e9521c`, not the reference page's `#e85d2a`. The reference is
 * a transcription of a video, and a BT.709 / 4:2:0 round trip of our accent
 * lands within ~8 RGB of it — the difference is chroma loss, not a design
 * choice. A source-level token beats a sampled one.
 */
const loneTrail: SkinMeta = {
  id: 'lone-trail',
  name: 'Lone Trail',
  tagline: 'Control room on paper',
  scheme: 'light',
  themeColor: '#faf8f5',
  swatch: '#1d569e',
  features: {
    unseal: true,
    halftone: false,
    scanline: true,
    gridOverlay: true,
    hud: false,
    printArtifacts: false,
    barcode: false,
    columnRules: true,
    crt: true,
    marquee: true,
    destijl: true,
    punchcard: true,
    morse: true,
  },
};

export default loneTrail;
