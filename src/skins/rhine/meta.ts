import type { SkinMeta } from '../contract';

/**
 * Rhine Lab — an archive dossier on paper.
 *
 * Palette and type are taken from the Rhine Lab motion dossier (MIT), which is
 * the visual reference this skin reproduces: warm grey paper, near-black ink,
 * one vermilion accent, and a monospace for anything that reads as data.
 */
const rhine: SkinMeta = {
  id: 'rhine',
  name: 'Rhine Lab',
  tagline: 'Archive dossier on paper',
  scheme: 'light',
  themeColor: '#f6f3eb',
  swatch: '#e9521c',
  features: {
    unseal: true,
    halftone: true,
    scanline: false,
    gridOverlay: true,
    hud: true,
    printArtifacts: true,
    barcode: true,
    columnRules: false,
    crt: false,
    marquee: false,
    destijl: false,
    punchcard: false,
    morse: false,
  },
};

export default rhine;
