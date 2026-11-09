/**
 * Paper — a printed ledger.
 *
 * This is NOT a colourway of another skin. It is a different document:
 * a serif title page, a ruled particulars table, a marginal figure, and
 * footnote apparatus. No telemetry band, no command bar, no cut corners,
 * no wide automotive Latin. Where `terminal` is a console, this is a book
 * that happens to have been set on a machine.
 *
 * The three rules this skin keeps (also written at the top of `skin.css`):
 *
 *   - Rules carry the structure. A single hairline separates every block;
 *     a doubled rule opens and closes the page. There is no card, no shadow
 *     and no filled panel anywhere except the spot colour in small doses.
 *   - The spot colour is ink, not paint. `#1b3f7a` appears as a rule, a
 *     small-caps label, a marginal figure tint — never as a filled banner.
 *   - Type does the talking: a serif for everything read, a mono for
 *     everything counted. No uppercase display type, no stretched widths.
 */
import type { SkinMeta } from '../contract';

const meta: SkinMeta = {
  id: 'paper',
  name: 'Paper',
  tagline: 'Printed ledger, set in type',
  scheme: 'light',
  themeColor: '#fbf9f4',
  swatch: '#1b3f7a',
  features: {
    unseal: true,
    halftone: true,
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
