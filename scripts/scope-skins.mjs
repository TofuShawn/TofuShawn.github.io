/**
 * scope-skins.mjs — wrap each skin's CSS in its own selector scope.
 *
 * Skin authors write plain CSS: `.masthead { background: var(--bg-sheet) }`.
 * If two skins both ship that rule unscoped, the one bundled last wins for
 * everyone — the second skin silently repaints the first. (Verified: a probe
 * skin's `.masthead{background:red}` shipped after press's and won.)
 *
 * So every rule a skin declares is rewritten as
 *   :root[data-skin='<id>'] <selector>
 * which makes the cascade per-skin by construction. Rules the author already
 * scoped with `:root[data-skin=...]` (the token block) are left alone.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const SRC = 'src/skins';
const OUT = 'src/skins/.generated/skins.css';

/** Split a stylesheet into top-level chunks: rule blocks and at-rule blocks. */
function splitTopLevel(css) {
  const out = [];
  let i = 0;
  let depth = 0;
  let start = 0;
  let inComment = false;
  let inString = null;

  while (i < css.length) {
    const ch = css[i];
    const next = css[i + 1];

    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (inString) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === '{') {
      depth++;
      i++;
      continue;
    }
    if (ch === '}') {
      depth--;
      i++;
      if (depth === 0) {
        out.push(css.slice(start, i));
        start = i;
      }
      continue;
    }
    i++;
  }
  if (start < css.length) {
    const tail = css.slice(start);
    if (tail.trim()) out.push(tail);
  }
  return out;
}

/** `a, b > c` → ['a', 'b > c'] — splitting on commas that are not inside parens. */
function splitSelectors(sel) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((s) => s.trim()).filter(Boolean);
}

const ALREADY_SCOPED = /^:root\[data-skin=/;

/**
 * Prefix one selector with the skin scope.
 *
 * The naive `scope + ' ' + selector` is wrong for selectors whose subject is
 * the root element itself: `html.lt-still .ticker` would become
 * `:root[data-skin='x'] .lt-still .ticker`, i.e. "an .lt-still *descendant* of
 * the root", which never matches because `lt-still` is set on <html>. So a
 * leading `html` or `:root` is spliced into the scope rather than appended
 * after it. (Found by measurement: reduced-motion classes were being applied
 * to <html> and the scoped rules silently never matched.)
 */
function scopeSelector(sel, id) {
  if (ALREADY_SCOPED.test(sel)) return sel;
  const scope = `:root[data-skin='${id}']`;
  if (/^:root\b/.test(sel)) return sel.replace(/^:root/, scope);
  if (/^html\b/.test(sel)) return sel.replace(/^html/, scope);
  return `${scope} ${sel}`;
}

/** At-rules that describe definitions rather than elements. Scoping them breaks them. */
const UNSCOPABLE = ['font-face', 'keyframes', 'property', 'counter-style', 'page', 'charset', 'import'];

/**
 * Pull leading comments off a chunk. They are prose about the rule that
 * follows, not part of its selector — if left in place they end up glued to
 * the front of the scoped selector (`:root[data-skin='x'] /* note *​/ .foo`),
 * which is still valid CSS but unreadable and breaks naive selector matching.
 */
function splitLeadingComments(chunk) {
  let rest = chunk;
  const comments = [];
  for (;;) {
    const trimmed = rest.replace(/^\s+/, '');
    if (!trimmed.startsWith('/*')) break;
    const end = trimmed.indexOf('*/');
    if (end === -1) break;
    comments.push(trimmed.slice(0, end + 2));
    rest = trimmed.slice(end + 2);
  }
  return { comments, rest };
}

function scopeChunk(chunk, id) {
  const { comments, rest } = splitLeadingComments(chunk);
  const prefix = comments.length ? comments.join('\n') + '\n' : '';

  const brace = rest.indexOf('{');
  if (brace === -1) return chunk; // a stray declaration or a comment

  const head = rest.slice(0, brace).trim();
  const body = rest.slice(brace);

  if (head.startsWith('@')) {
    const atName = head.slice(1).split(/[\s(]/)[0].toLowerCase();
    if (UNSCOPABLE.includes(atName)) return chunk;
    const inner = body.slice(1, body.lastIndexOf('}'));
    const scopedInner = splitTopLevel(inner)
      .map((c) => scopeChunk(c, id))
      .join('\n');
    return `${prefix}${head}{${scopedInner}}`;
  }

  const sels = splitSelectors(head);
  const scoped = sels.map((s) => scopeSelector(s, id));
  return `${prefix}${scoped.join(', ')}${body}`;
}

const dirs = readdirSync(SRC).filter((d) => {
  if (d.startsWith('_') || d.startsWith('.')) return false;
  return statSync(join(SRC, d)).isDirectory();
});

const parts = [];
for (const id of dirs) {
  const file = join(SRC, id, 'skin.css');
  let css;
  try {
    css = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const scoped = splitTopLevel(css)
    .map((c) => scopeChunk(c, id))
    .join('\n');
  parts.push(`/* ==== skin: ${id} ==== */\n${scoped.trim()}\n`);
}

mkdirSync(dirname(OUT), { recursive: true });

// Every skin also gets the one rule that reveals its own furniture wrapper.
// It lives here rather than in base.css so that base.css never has to name a
// skin — adding a skin must not require editing a shared file.
const wrappers = dirs
  .map((id) => `:root[data-skin='${id}'] .skin-only[data-only='${id}'] { display: contents; }`)
  .join('\n');

writeFileSync(OUT, parts.join('\n') + `\n/* ==== furniture wrappers ==== */\n${wrappers}\n`, 'utf8');
console.log(`scoped ${dirs.length} skin(s) -> ${OUT}`);
