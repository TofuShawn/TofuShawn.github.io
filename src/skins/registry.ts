/**
 * Skin registry.
 *
 * Skins are discovered from the filesystem, so adding `src/skins/<id>/` with a
 * `meta.ts` and a `skin.css` is the entire install procedure — no config edit.
 *
 * The registry is built at module scope and cached, because every page imports it.
 */
import { DEFAULT_FEATURES, type SkinFeatures, type SkinMeta } from './contract';

type MetaModule = { default: SkinMeta };

const metaModules = import.meta.glob<MetaModule>('./*/meta.ts', { eager: true });

function normalise(raw: SkinMeta, folder: string): SkinMeta {
  if (raw.id !== folder) {
    throw new Error(
      `Skin folder "${folder}" declares id "${raw.id}". They must match, because the id ` +
        `selects the skin via [data-skin] and the folder is how skin.css is found.`,
    );
  }
  return { ...raw, features: { ...DEFAULT_FEATURES, ...raw.features } };
}

export const SKINS: SkinMeta[] = Object.entries(metaModules)
  // Folders beginning with `_` are scaffolding, not skins — `_template` is the
  // copy-me starter. Keeping them out of the registry means a half-finished
  // template can never appear in the switcher or break the build.
  .filter(([path]) => !path.split('/')[1].startsWith('_'))
  .map(([path, mod]) => {
    const folder = path.split('/')[1];
    if (!mod?.default) throw new Error(`Skin "${folder}" has no default export in meta.ts`);
    return normalise(mod.default, folder);
  })
  .sort((a, b) => a.name.localeCompare(b.name));

if (SKINS.length === 0) {
  throw new Error('No skins found. At least one folder under src/skins/ must export meta.ts.');
}

/**
 * The default skin, declared explicitly rather than taken from the sort order.
 *
 * Picking `SKINS[0]` looks harmless and is not: the list is sorted by display
 * name, so adding a skin called "Aurora" would silently become the default and
 * every visitor would land on a different site. The default is a product
 * decision, so it is written down. If the named skin is missing the build fails
 * loudly instead of falling back.
 */
export const DEFAULT_SKIN_ID = 'lone-trail';

if (!SKINS.some((s) => s.id === DEFAULT_SKIN_ID)) {
  throw new Error(
    `DEFAULT_SKIN_ID is "${DEFAULT_SKIN_ID}" but no such skin exists. ` +
      `Available: ${SKINS.map((s) => s.id).join(', ')}.`,
  );
}

export function getSkin(id: string | undefined | null): SkinMeta {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function isSkinId(id: string): boolean {
  return SKINS.some((s) => s.id === id);
}

/** Per-skin feature lookup for the current skin. */
export function featuresOf(id: string): SkinFeatures {
  return getSkin(id).features;
}

/**
 * The union of every skin's features.
 *
 * Pages render furniture (crop marks, the barcode canvas, the seal) at build
 * time, but the active skin is only known in the browser — a visitor can
 * switch without a rebuild. So the build has to emit the *superset* of DOM and
 * let each skin's CSS decide what it wants to show. A skin that enables
 * nothing therefore renders nothing extra, and a skin that enables `barcode`
 * still gets its canvas when another skin is the default.
 *
 * This is why every skin's `skin.css` is responsible for hiding furniture it
 * does not use: the DOM is a superset by construction.
 */
export function featuresAny(): SkinFeatures {
  const keys = Object.keys(DEFAULT_FEATURES) as (keyof SkinFeatures)[];
  const out = { ...DEFAULT_FEATURES };
  for (const k of keys) out[k] = SKINS.some((s) => s.features[k]);
  return out;
}
