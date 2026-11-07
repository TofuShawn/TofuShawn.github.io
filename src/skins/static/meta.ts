/**
 * Static — the fallback skin.
 *
 * Every other skin in this template ships a client script and a chrome
 * component. This one ships neither, on purpose. It is what a visitor gets when
 * they ask for reduced motion, when a CDN eats the bundle, or when they simply
 * want to read: markup and CSS only.
 *
 * That is why every flag below is false. A flag here means "this skin renders
 * and styles that furniture", and this skin has nothing to render it with — the
 * `display: none` block at the top of `skin.css` exists because
 * `featuresAny()` still emits every other skin's furniture into every page.
 *
 * `skin.css` records the one consequence that is not cosmetic: the cover page
 * asks for the ceremony, so `<body>` arrives carrying `locked`, and only a
 * script clears it. No script lives here, so the stylesheet clears it instead.
 */
import type { SkinMeta } from '../contract';

const meta: SkinMeta = {
  id: 'static',
  name: 'Static',
  tagline: 'No script, no ceremony',
  scheme: 'light',
  themeColor: '#f4f4f2',
  swatch: '#fffa00',
  features: {
    unseal: false,
    halftone: false,
    scanline: false,
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
