#!/usr/bin/env node
/**
 * new-post — scaffold a Markdown file in `src/content/posts/`.
 *
 * Two callers, one script:
 *   - a human typing `npm run new` gets prompted for each field;
 *   - an agent passing flags gets a non-interactive run that never hangs
 *     waiting on stdin.
 *
 * It writes the frontmatter and a skeleton body, and nothing else. It does not
 * invent prose, pick tags you did not ask for, or renumber existing posts. The
 * rules it enforces are the ones in WRITING.md; when this script warns, that
 * file explains why the rule exists.
 *
 * Usage
 *   npm run new                                  prompt for everything
 *   npm run new -- --title "On paper"
 *   npm run new -- --title "On paper" --note     note mode (no headings)
 *   npm run new -- --title "On paper" --tags design,print --code GD-0042
 *   npm run new -- --title "On paper" --date 2026-04-01
 *   npm run new -- --title "On paper" --dry-run  print, do not write
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const POSTS_DIR = join(process.cwd(), 'src', 'content', 'posts');

/** The tag vocabulary the site ships with. A new tag is allowed, not default. */
const KNOWN_TAGS = [
  'design', 'writing', 'typography', 'print', 'grids', 'archives', 'notes', 'colour', 'canvas',
];

/** Tag → code prefix, from WRITING.md. Order matters: first match wins. */
const CODE_PREFIX = {
  grids: 'GD',
  colour: 'CL',
  print: 'HT',
  archives: 'OA',
  notes: 'NT',
};

// ---------------------------------------------------------------------------
// argv
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const key = a.slice(2);
    // Boolean flags we support.
    if (key === 'note' || key === 'dry-run' || key === 'help') {
      out[key] = true;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true; // flag with no value; validate later
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// derivation
// ---------------------------------------------------------------------------
/**
 * Turn a title into a URL slug.
 *
 * Only `[a-z0-9-]` survives, so a title in Chinese or any other non-Latin
 * script collapses to an empty string. That is not a bug to work around here:
 * a CJK slug would percent-encode into an unreadable URL, so those posts need
 * an explicit `--slug`. We detect the empty case and say so.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents: café → cafe
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Quote a YAML scalar. Always double-quoted: titles contain commas and colons. */
function yamlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function pad(n, width) {
  return String(n).padStart(width, '0');
}

/**
 * Suggest the next serial for a code prefix by scanning what already exists.
 *
 * Serial, not date: codes do not sort, and gaps are fine. This reads the
 * directory rather than assuming a counter file, so a hand-written post with a
 * high number is respected.
 */
function nextCode(prefix) {
  let max = 0;
  for (const file of readdirSync(POSTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const head = readFileSync(join(POSTS_DIR, file), 'utf8').slice(0, 600);
    const m = head.match(/^code:\s*['"]?([A-Z]{2})-(\d{1,4})/m);
    if (m && m[1] === prefix) max = Math.max(max, Number(m[2]));
  }
  return `${prefix}-${pad(max + 1, 4)}`;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        'new-post — scaffold a post',
        '',
        '  npm run new                                  prompt for everything',
        '  npm run new -- --title "On paper"',
        '  npm run new -- --title "On paper" --note',
        '  npm run new -- --title "On paper" --tags design,print --code GD-0042',
        '  npm run new -- --title "On paper" --date 2026-04-01 --slug on-paper',
        '  npm run new -- --title "On paper" --dry-run',
        '',
        'Flags: --title --slug --description --date --tags --code --note --dry-run',
        '',
        'See WRITING.md for what makes a good post.',
      ].join('\n'),
    );
    return;
  }

  if (!existsSync(POSTS_DIR)) {
    console.error(`× Not in a blog checkout: ${POSTS_DIR} does not exist.`);
    console.error('  Run this from the project root.');
    process.exit(1);
  }

  // Interactive only when something is missing and stdin is a terminal. An
  // agent run with flags must never block on a prompt it cannot answer.
  const missing = !args.title;
  const interactive = missing && stdin.isTTY;
  const rl = interactive ? createInterface({ input: stdin, output: stdout }) : null;

  try {
    let title = args.title;
    if (!title && rl) {
      title = (await rl.question('Title (sentence case, no trailing period): ')).trim();
    }
    if (!title || typeof title !== 'string') {
      console.error('× A --title is required (or run interactively in a terminal).');
      process.exit(1);
    }

    let slug = typeof args.slug === 'string' ? slugify(args.slug) : slugify(title);
    if (!slug) {
      // Non-Latin title with no explicit slug.
      if (!rl) {
        console.error('× The title produced an empty slug — it has no Latin characters.');
        console.error('  Pass --slug with an ASCII version, e.g. --slug on-paper.');
        process.exit(1);
      }
      const answer = (await rl.question('Slug for the URL (ASCII, e.g. on-paper): ')).trim();
      slug = slugify(answer);
      if (!slug) {
        console.error('× Still empty. The slug needs at least one Latin letter or digit.');
        process.exit(1);
      }
    }

    let description = typeof args.description === 'string' ? args.description : '';
    if (!description && rl) {
      description = (await rl.question('Description (one sentence): ')).trim();
    }

    let tags = [];
    if (typeof args.tags === 'string') {
      tags = args.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    } else if (rl) {
      const answer = (await rl.question(`Tags, comma separated [${KNOWN_TAGS.slice(0, 5).join(', ')}…]: `)).trim();
      tags = answer ? answer.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    }

    const isNote = Boolean(args.note);
    if (!isNote && rl) {
      const answer = (await rl.question('Mode — [e]ntry (default) or [n]ote: ')).trim().toLowerCase();
      if (answer.startsWith('n')) args.note = true;
    }

    let date = typeof args.date === 'string' ? args.date : today();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.error(`× --date must be YYYY-MM-DD, got "${date}".`);
      process.exit(1);
    }

    // Code: explicit, else suggested from the primary tag's prefix.
    let code = typeof args.code === 'string' ? args.code : '';
    if (code && !/^[A-Z]{2}-\d{3,4}$/.test(code)) {
      console.error(`× --code should look like GD-0042, got "${code}".`);
      process.exit(1);
    }
    if (!code) {
      const prefixTag = tags.find((t) => CODE_PREFIX[t]);
      if (prefixTag) {
        code = nextCode(CODE_PREFIX[prefixTag]);
      } else if (rl) {
        const answer = (await rl.question('Code (e.g. GD-0042, blank to skip): ')).trim();
        code = answer;
      }
    }

    // ---- warnings, not errors -------------------------------------------
    const warnings = [];
    if (!description) {
      warnings.push('`description` is empty — required by the schema, fill it in or the build fails.');
    }
    if (/[,:]/.test(title)) {
      // Not a problem: we quote it. Noted so the reader knows it was handled.
    }
    if (title.length > 70) {
      warnings.push(`Title is ${title.length} characters — the display size will wrap awkwardly.`);
    }
    const unknown = tags.filter((t) => !KNOWN_TAGS.includes(t));
    if (unknown.length) {
      warnings.push(
        `New tag(s): ${unknown.join(', ')}. /tags/ is a ruled register — every tag costs a row. ` +
          'Merge into an existing tag unless the subject genuinely has no home.',
      );
    }
    if (!code) {
      warnings.push('No `code` set — the index will show the first 8 characters of the slug, uppercased.');
    }
    if (isNote && tags.length > 3) {
      warnings.push(`A note has ${tags.length} tags. Notes carry one or two.`);
    }
    if (!isNote && !rl && !args.description) {
      warnings.push('Running non-interactively without --description.');
    }

    // ---- body ------------------------------------------------------------
    const body = args.note
      ? [
          '',
          'Write the note here. No headings — a note is a remark with a date attached.',
          '',
          'Under ~400 words. The first sentence is the claim; the last one is not a summary.',
          '',
        ].join('\n')
      : [
          '',
          'The first sentence is the claim. Not context, not an introduction — the argument.',
          '',
          '## A section',
          '',
          'Develop it. State the number, if there is one.',
          '',
          '### A subsection',
          '',
          '`##` and `###` only; deeper headings vanish from the table of contents.',
          '',
          '## Another section',
          '',
          'End on a fact, an aphorism, or an image. Not a summary.',
          '',
        ].join('\n');

    // ---- frontmatter -----------------------------------------------------
    const fm = ['---', `title: ${yamlString(title)}`];
    if (description) fm.push(`description: ${yamlString(description)}`);
    else fm.push('description: "" # TODO required');
    fm.push(`date: ${date}`);
    if (tags.length) fm.push(`tags: [${tags.map((t) => `'${t}'`).join(', ')}]`);
    if (code) fm.push(`code: '${code}'`);
    fm.push('---');

    const content = `${fm.join('\n')}\n${body}`;
    const target = join(POSTS_DIR, `${slug}.md`);

    // ---- output ----------------------------------------------------------
    if (args['dry-run']) {
      console.log(`# would write src/content/posts/${slug}.md\n`);
      console.log(content);
      return;
    }

    if (existsSync(target)) {
      console.error(`× src/content/posts/${slug}.md already exists.`);
      console.error('  Pick another title, or pass --slug.');
      process.exit(1);
    }

    writeFileSync(target, content, 'utf8');

    console.log(`✓ src/content/posts/${slug}.md`);
    console.log(`  /posts/${slug}/`);
    if (code) console.log(`  code ${code}`);
    if (tags.length) console.log(`  tags ${tags.join(', ')}`);
    if (warnings.length) {
      console.log('');
      for (const w of warnings) console.log(`  ! ${w}`);
    }
    console.log('');
    console.log('  npm run dev   → http://localhost:4321/');
  } finally {
    rl?.close();
  }
}

main().catch((err) => {
  console.error(`× ${err.message}`);
  process.exit(1);
});
