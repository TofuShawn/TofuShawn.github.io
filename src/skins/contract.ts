/**
 * The skin contract.
 *
 * A skin is a folder under `src/skins/`. To be valid it must supply:
 *   - `meta.ts`   default-exporting a `SkinMeta`
 *   - `skin.css`  defining every token in `REQUIRED_TOKENS` for `:root[data-skin="<id>"]`
 *
 * `npm run check` enforces both, so a half-finished skin fails the build instead
 * of silently rendering with another skin's leftovers.
 */

/** Every custom property a skin must define. Adding one here is a breaking change. */
export const REQUIRED_TOKENS = [
  // --- surface -------------------------------------------------------------
  '--bg',            // page background, outside the content sheet
  '--bg-sheet',      // the content sheet itself
  '--bg-elev',       // a raised panel inside the sheet (figure plate, table zebra)
  '--fg',            // primary text / structural rules
  '--fg-soft',       // body copy
  '--fg-mute',       // captions, metadata, footnotes
  '--rule',          // a rule you are meant to see
  '--rule-soft',     // a divider you are meant to feel, not see

  // --- accent --------------------------------------------------------------
  '--accent',        // the one accent colour; decorative share must stay small
  '--accent-text',   // same hue, darkened until it passes 4.5:1 as small text
  '--accent-soft',   // accent at low alpha, for fills
  '--on-accent',     // text that sits on a solid accent fill

  // --- type ----------------------------------------------------------------
  '--font-display',
  '--font-body',
  '--font-mono',
  '--fs-cover',
  '--fs-display',
  '--fs-h1',
  '--fs-h2',
  '--fs-lead',
  '--fs-body',
  '--fs-cap',
  '--fs-micro',
  '--lh-body',
  '--lh-display',
  '--tracking-display',
  '--tracking-caps',

  // --- layout --------------------------------------------------------------
  '--measure',       // content width
  '--margin',        // horizontal page margin inside the sheet
  '--gutter',
  '--baseline',
  '--radius',
  '--shadow-sheet',

  // --- motion --------------------------------------------------------------
  '--dur-fast',
  '--dur-base',
  '--dur-slow',
  '--ease-out',
] as const;

export type TokenName = (typeof REQUIRED_TOKENS)[number];

/** Optional features a skin may switch on. Anything false must not render DOM. */
export type SkinFeatures = {
  /** Opening "break the seal" overlay. Needs a click to start. */
  unseal: boolean;
  /** Plates are painted as a 45° halftone screen on canvas. */
  halftone: boolean;
  /** Plates are painted as a scanline sphere on canvas. */
  scanline: boolean;
  /** Synthesised UI sound. Always gated behind a user gesture. */
  sound: boolean;
  /** Press `G` to overlay the layout grid. */
  gridOverlay: boolean;
  /** Fixed coordinate readout in the corner. */
  hud: boolean;
  /** Print-shop artifacts: crop marks, registration targets, fold lines, binding. */
  printArtifacts: boolean;
  /** Decorative barcode in the cover metadata block. */
  barcode: boolean;
  /** Exposed column rules: 1px lines between grid tracks instead of whitespace. */
  columnRules: boolean;
  /** CRT layer: scanline texture, a sweeping beam, and a glowing horizon. */
  crt: boolean;
  /** A scrolling telemetry marquee strip under the masthead. */
  marquee: boolean;
  /** De Stijl tri-colour blocks used as structural decoration. */
  destijl: boolean;
  /** Punch-card bit matrix in the cover metadata block. */
  punchcard: boolean;
  /** Morse dot-dash readout used as a decorative caption. */
  morse: boolean;
};

export type SkinMeta = {
  /** Folder name; must match `data-skin` in skin.css. */
  id: string;
  /** Shown in the switcher. */
  name: string;
  /** One line, shown under the name in the switcher. */
  tagline: string;
  /** `light` or `dark`, used for `color-scheme`. */
  scheme: 'light' | 'dark';
  /** Browser chrome colour for the meta theme-color tag. */
  themeColor: string;
  /** Hex used as the switcher swatch. Cosmetic only — not read by the layout. */
  swatch: string;
  features: SkinFeatures;
};

export const DEFAULT_FEATURES: SkinFeatures = {
  unseal: false,
  halftone: false,
  scanline: false,
  sound: false,
  gridOverlay: false,
  hud: false,
  printArtifacts: false,
  barcode: false,
  columnRules: false,
  crt: false,
  marquee: false,
  destijl: false,
  punchcard: false,
  morse: false,
};
