#!/usr/bin/env node
/**
 * Static checks that do not need a browser.
 *
 *  1. Every skin folder has meta.ts + skin.css, and the ids agree.
 *  2. Every skin defines every token in the contract.
 *  3. No colour literal appears outside `src/skins/` — visual decisions may not
 *     leak into shared components or the base stylesheet.
 *
 * Exported as `runChecks()` so `verify.mjs` can run them in-process: some
 * sandboxed hosts refuse `child_process.spawn`, so a checker that shells out to
 * another checker is not portable. Run directly with `npm run check`.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const SRC = join(ROOT, 'src');

// Imported dynamically so this script does not need a TS loader.
const { REQUIRED_TOKENS } = await import(new URL('../src/skins/contract.ts', import.meta.url).href);

/**
 * @returns {Promise<{errors: string[], notes: string[], skinCount: number}>}
 */
export async function runChecks() {
  const errors = [];
  const notes = [];

  /* ---------------------------------------------------------------- skins -- */

  const skinsDir = join(SRC, 'skins');
  const entries = await readdir(skinsDir, { withFileTypes: true });
  // `_`-prefixed folders are scaffolding (`_template`), not skins: the registry
  // skips them, so the checker must skip them too or it would demand that the
  // starter declare an id matching its own underscore name. `.`-prefixed
  // folders are build output (`.generated/` holds the scoped CSS bundle).
  const skinDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
    .map((e) => e.name);

  if (skinDirs.length === 0) errors.push('No skins found in src/skins/');

  for (const dir of skinDirs) {
    const base = join(skinsDir, dir);

    for (const required of ['meta.ts', 'skin.css']) {
      try {
        await stat(join(base, required));
      } catch {
        errors.push(`src/skins/${dir}/: missing ${required}`);
      }
    }

    // meta.ts must declare the folder's own id.
    try {
      const metaSrc = await readFile(join(base, 'meta.ts'), 'utf8');
      const m = metaSrc.match(/id:\s*['"]([^'"]+)['"]/);
      if (!m) {
        errors.push(`src/skins/${dir}/meta.ts: no \`id\` field`);
      } else if (m[1] !== dir) {
        errors.push(`src/skins/${dir}/meta.ts: id "${m[1]}" does not match folder "${dir}"`);
      }
    } catch {
      /* already reported above */
    }

    // Token completeness.
    try {
      const css = await readFile(join(base, 'skin.css'), 'utf8');
      const selector = new RegExp(`:root\\[data-skin=['"]${dir}['"]\\]\\s*\\{([\\s\\S]*?)\\n\\}`);
      const block = css.match(selector);
      if (!block) {
        errors.push(`src/skins/${dir}/skin.css: no \`:root[data-skin="${dir}"]\` block`);
      } else {
        const defined = new Set([...block[1].matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((x) => x[1]));
        const missing = REQUIRED_TOKENS.filter((t) => !defined.has(t));
        if (missing.length) {
          errors.push(
            `src/skins/${dir}/skin.css: missing ${missing.length} required token(s):\n` +
              missing.map((t) => `      ${t}`).join('\n'),
          );
        }
        notes.push(`skin "${dir}": ${defined.size} tokens defined`);
      }
    } catch {
      /* already reported */
    }
  }

  /* ----------------------------------------------------- colour containment -- */

  const COLOUR = /(?<![\w-])(#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\))/;

  async function walk(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(p)));
      else out.push(p);
    }
    return out;
  }

  const srcFiles = await walk(SRC);
  const allowedSkin = `${sep}skins${sep}`;

  for (const file of srcFiles) {
    const rel = relative(ROOT, file);
    if (file.includes(allowedSkin)) continue;
    if (!/\.(css|astro|ts)$/.test(file)) continue;

    const text = await readFile(file, 'utf8');
    const lines = text.split('\n');

    lines.forEach((line, i) => {
      // Ignore comments and obvious non-colour hex (ids, hashes).
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (!COLOUR.test(line)) return;
      // `content: '#'` style false positives and SVG path data are rare enough to
      // leave; anything else is a real leak.
      if (/url\(/.test(line)) return;
      errors.push(
        `${rel}:${i + 1}: colour literal outside src/skins/ — move it into the skin.\n      ${trimmed.slice(0, 110)}`,
      );
    });
  }

  return { errors, notes, skinCount: skinDirs.length };
}

/* ------------------------------------------------------------------ main -- */

const invokedDirectly =
  process.argv[1] && fileURLToPath(new URL(`file://${process.argv[1]}`)).endsWith('check.mjs');

if (invokedDirectly) {
  const { errors, notes, skinCount } = await runChecks();
  for (const n of notes) console.log(`  ${n}`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log(`\n✓ ${skinCount} skin(s) valid, no colour leaks outside src/skins/.`);
}
