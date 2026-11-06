/**
 * Content pipeline.
 *
 * Posts are plain Markdown in `src/content/posts/`. They are loaded with
 * `import.meta.glob` and validated with Zod at build time, so a typo in
 * frontmatter fails the build with a useful message instead of rendering an
 * empty page.
 *
 * Why not `astro:content`? Its loader path is heavier and version-coupled, and
 * this template wants the pipeline readable end to end: glob → validate →
 * derive → sort. Swapping to collections later only means replacing `loadAll`.
 */
import { z } from 'zod';

const postSchema = z.object({
  title: z.string().min(1),
  /** Optional Chinese title, shown under the Latin one where the layout allows. */
  titleCn: z.string().optional(),
  description: z.string().min(1),
  /** ISO date. `YYYY-MM-DD` is enough. */
  date: z.union([z.string(), z.date()]),
  /** Optional last-revision date, shown in the article footer. */
  updated: z.union([z.string(), z.date()]).optional(),
  tags: z.array(z.string()).default([]),
  /** Pin a post to the top of the index. */
  featured: z.boolean().default(false),
  /** Hide from the index and RSS while still building the page. */
  draft: z.boolean().default(false),
  /** Short code shown in the index list, e.g. "OA-0417". Falls back to the slug. */
  code: z.string().optional(),
  /** Optional language tag for `lang` on <article>. */
  lang: z.string().optional(),
});

export type PostFrontmatter = z.infer<typeof postSchema>;

export type Heading = { depth: number; slug: string; text: string };

export type Post = PostFrontmatter & {
  slug: string;
  /** Normalised to a Date for sorting and formatting. */
  dateObj: Date;
  updatedObj: Date | null;
  /** Estimated minutes at ~220 words/min, floored at 1. */
  readingTime: number;
  /** Word count across Latin and CJK runs. */
  words: number;
  /** "OA-0417" if authored, else an uppercase slice of the slug. */
  displayCode: string;
  /** `YYYY-MM` for grouping. */
  yearMonth: string;
  year: string;
  headings: Heading[];
  /** Rendered body, as an Astro component. */
  Content: any;
  raw: string;
};

type MarkdownModule = {
  frontmatter: Record<string, unknown>;
  default: any;
  rawContent?: () => string;
  getHeadings?: () => Heading[];
};

const modules = import.meta.glob<MarkdownModule>('../content/posts/*.md', { eager: true });

function toDate(value: string | Date, field: string, slug: string): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Post "${slug}": \`${field}\` is not a valid date (got ${String(value)}).`);
  }
  return d;
}

/**
 * Count words the way a bilingual page actually reads: Latin runs count as one
 * word each, and each CJK character counts as one word.
 */
function countWords(text: string): number {
  const latin = text.match(/[A-Za-z0-9][A-Za-z0-9'’\-]*/g)?.length ?? 0;
  const cjk = text.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g)?.length ?? 0;
  return latin + cjk;
}

function loadAll(): Post[] {
  const posts = Object.entries(modules).map(([path, mod]) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '');

    const parsed = postSchema.safeParse(mod.frontmatter ?? {});
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      throw new Error(`Post "${slug}" has invalid frontmatter:\n${issues}`);
    }
    const fm = parsed.data;

    const dateObj = toDate(fm.date, 'date', slug);
    const updatedObj = fm.updated ? toDate(fm.updated, 'updated', slug) : null;
    const raw = mod.rawContent?.() ?? '';
    const words = countWords(raw);
    const headings = (mod.getHeadings?.() ?? [])
      .filter((h) => h.depth === 2 || h.depth === 3)
      .map((h) => ({ depth: h.depth, slug: h.slug, text: h.text }));

    const iso = dateObj.toISOString();

    return {
      ...fm,
      slug,
      dateObj,
      updatedObj,
      words,
      readingTime: Math.max(1, Math.round(words / 220)),
      displayCode: fm.code ?? slug.slice(0, 8).toUpperCase(),
      yearMonth: iso.slice(0, 7),
      year: iso.slice(0, 4),
      headings,
      Content: mod.default,
      raw,
    } satisfies Post;
  });

  // Newest first; featured posts float to the top of their own list, not here,
  // so the archive stays strictly chronological.
  return posts.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
}

export const ALL_POSTS: Post[] = loadAll();

/** Posts that should appear in listings, RSS, and the sitemap. */
export const POSTS: Post[] = ALL_POSTS.filter((p) => !p.draft);

export const FEATURED: Post[] = POSTS.filter((p) => p.featured);

export function getPost(slug: string): Post | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}

/** Previous/next in chronological order (older / newer). */
export function getAdjacent(slug: string): { prev: Post | null; next: Post | null } {
  const i = POSTS.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: POSTS[i + 1] ?? null, // older
    next: POSTS[i - 1] ?? null, // newer
  };
}

export type TagCount = { tag: string; count: number };

export function getTags(): TagCount[] {
  const counts = new Map<string, number>();
  for (const p of POSTS) {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function getPostsByTag(tag: string): Post[] {
  return POSTS.filter((p) => p.tags.includes(tag));
}

/** Posts grouped by year, newest first, for the archive listing. */
export function groupByYear(posts: Post[]): { year: string; posts: Post[] }[] {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const list = map.get(p.year) ?? [];
    list.push(p);
    map.set(p.year, list);
  }
  return [...map.entries()]
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, list]) => ({ year, posts: list }));
}

/** URL for a post. Directory format, so links end with a slash. */
export function postUrl(post: Post): string {
  return `/posts/${post.slug}/`;
}

export function tagUrl(tag: string): string {
  return `/tags/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}/`;
}

/** Same slug rule used by the tag pages, kept in one place. */
export function tagSlug(tag: string): string {
  return tag.toLowerCase().replace(/\s+/g, '-');
}
