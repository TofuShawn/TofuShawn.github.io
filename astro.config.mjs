// @ts-check
import { defineConfig } from 'astro/config';

// Update `site` to your production origin: it is used for canonical URLs,
// the sitemap, and absolute image paths in RSS.
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  build: { format: 'directory' },
  markdown: {
    shikiConfig: {
      // Both skins are low-chroma; a mid-contrast theme reads on paper and on black.
      theme: 'github-dark-dimmed',
      wrap: true,
    },
  },
  devToolbar: { enabled: false },
});
