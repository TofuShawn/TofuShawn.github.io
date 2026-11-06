import type { APIContext } from 'astro';
import { POSTS } from '../lib/posts';
import { SITE } from '../lib/site';

/** Minimal sitemap. Kept in-repo so the template has no extra dependency. */
export async function GET(context: APIContext) {
  const base = (context.site ?? new URL(SITE.url)).href.replace(/\/$/, '');

  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/posts/', priority: '0.9' },
    { loc: '/tags/', priority: '0.6' },
    { loc: '/about/', priority: '0.5' },
    ...POSTS.map((p) => ({ loc: `/posts/${p.slug}/`, priority: '0.8', lastmod: p.updatedObj ?? p.dateObj })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${base}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
}
