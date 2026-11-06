import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { POSTS, postUrl } from '../lib/posts';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  return rss({
    title: `${SITE.title} — ${SITE.subtitle}`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: POSTS.map((post) => ({
      title: post.title,
      description: post.description,
      pubDate: post.dateObj,
      link: postUrl(post),
      categories: post.tags,
      customData: `<language>${SITE.locale}</language>`,
    })),
    customData: `<language>${SITE.locale}</language>`,
  });
}
