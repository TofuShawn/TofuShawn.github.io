/**
 * Skin metadata.
 *
 * The `id` MUST equal this folder's name — the registry throws otherwise, because
 * the id selects the skin via `[data-skin]` while the folder is how `skin.css`
 * and `Chrome.astro` are found. Copy this folder to `src/skins/<your-id>/`, change
 * the id, and you have a new skin.
 */
import type { SkinMeta } from '../contract';

const meta: SkinMeta = {
  id: 'template',
  name: 'Template',
  tagline: 'Copy me, then delete me',
  scheme: 'light',
  themeColor: '#f6f3eb',
  swatch: '#e9521c',
  features: {
    // Everything is off by default: a skin should have to opt in to furniture,
    // not opt out of it. Turn on only what this skin actually implements.
    //
    // These flags gate DOM the *layout* emits. Because a visitor can switch
    // skins in the browser, every page ships the union of all skins' furniture
    // and CSS decides what is seen — so a flag set here is a promise that this
    // skin has styles for those elements. Set a flag to true with no CSS and
    // the furniture renders unstyled in your skin; set it to false and your
    // skin's CSS must hide the pieces another skin turned on.
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
  },
};

export default meta;
