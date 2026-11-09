import type { SkinMeta } from '../contract';

/**
 * Press — a press proof, still on the bed.
 *
 * The page behaves like a sheet pulled for approval: crop marks at the corners,
 * a colour bar, registration targets, a halftone plate, a folio. Those are the
 * marks a printer checks before the run is signed off, which is why they are
 * furniture here and not decoration.
 *
 * Palette and type are taken from the Rhine Lab motion dossier (MIT), which is
 * the visual reference this skin reproduces: warm grey paper, near-black ink,
 * one vermilion accent, and a monospace for anything that reads as data.
 */
const press: SkinMeta = {
  id: 'press',
  name: 'Press',
  tagline: 'A press proof, still on the bed',
  scheme: 'light',
  themeColor: '#f6f3eb',
  swatch: '#e9521c',
  features: {
    unseal: true,
    halftone: true,
    scanline: false,
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

export default press;
