/**
 * Paper — the light half of the industrial pair.
 *
 * Same report language as `terminal`, printed rather than projected: white
 * paper on a cold ground, one signal colour used as fill only.
 *
 * The three rules this skin keeps (also written at the top of `skin.css`):
 *
 *   - The accent is a FILL, never a line or a word. `#18d1ff` is 1.81:1 on
 *     white; it only works as a block of colour with ink on top. Type in the
 *     signal family is `--accent-text` `#0a6c8f`.
 *   - A cut corner means "pressable". Body copy, images and display panels
 *     stay square, so shape alone separates a control from a container.
 *   - Wide uppercase Latin sits above normal-width bold Chinese. That pairing
 *     is the whole industrial register; lose it and this is just a greyscale
 *     blog with a cyan highlighter.
 */
import type { SkinMeta } from '../contract';

const meta: SkinMeta = {
  id: 'paper',
  name: 'Paper',
  tagline: 'Industrial report, printed',
  scheme: 'light',
  themeColor: '#eaeef1',
  swatch: '#18d1ff',
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

export default meta;
