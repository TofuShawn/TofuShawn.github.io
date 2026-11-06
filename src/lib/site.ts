/** Site-wide configuration. Edit this file to make the template yours. */

export const SITE = {
  title: 'Archive',
  /** Shown in the masthead next to the title. */
  subtitle: 'A field notebook',
  description:
    'A personal blog built on paper: long-form notes, index cards, and figures, set in a dossier that behaves like print.',
  author: 'Your Name',
  /** Used for canonical URLs and RSS. Must match `site` in astro.config.mjs. */
  url: 'https://example.com',
  locale: 'en',
  /** Shown in the colophon. */
  colophon: {
    published: 'Archive Press',
    printed: 'Set in Helvetica Neue and Source Han Sans, with JetBrains Mono for data.',
    type: 'Twelve columns on a 1180px measure, 8px baseline.',
    sound: 'Interface tones are synthesised at runtime. No audio files are shipped.',
  },
} as const;

/** Primary navigation. Order matters. */
export const NAV = [
  { href: '/', label: 'Cover', en: 'Cover' },
  { href: '/posts/', label: 'Index', en: 'Index' },
  { href: '/tags/', label: 'Tags', en: 'Tags' },
  { href: '/about/', label: 'Colophon', en: 'Colophon' },
] as const;

/** Posts shown on the cover's index card list. */
export const COVER_INDEX_LIMIT = 5;
