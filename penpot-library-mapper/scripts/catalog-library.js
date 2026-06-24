/**
 * LIBRARY MAPPER — CATALOG
 * Scanne une bibliothèque Penpot (locale ou connectée) → manifest JSON persistant.
 *
 * Usage : coller dans penpot:execute_code.
 * Output : JSON dans la console → à sauvegarder dans
 *          manifests/<librarySlug>-manifest.json du skill.
 *
 * Gotchas intégrés :
 *  - variants filtrés via .isVariant && c.isVariant()
 *  - l'index des axes de variants est POSITIONNEL → enregistré explicitement
 */

const LIBRARY = 'local'; // 'local' | nom d'une bibliothèque connectée

// ─── 1. Résolution de la bibliothèque ────────────────────────────────────────

let lib;
if (LIBRARY === 'local') {
  lib = penpot.library.local;
} else {
  lib = (penpot.library.connected ?? []).find(l =>
    (l.name ?? '').toLowerCase().includes(LIBRARY.toLowerCase()));
  if (!lib) throw new Error(`❌ Bibliothèque connectée "${LIBRARY}" introuvable. Disponibles : ${(penpot.library.connected ?? []).map(l => l.name).join(', ')}`);
}

const libName = lib.name ?? penpot.currentFile?.name ?? 'local-library';
const slug = libName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ─── 2. Scan des composants ──────────────────────────────────────────────────

const allComponents = lib.components ?? [];

// ⚠️ Séparer conteneurs principaux et variants
const variants = allComponents.filter(c => c.isVariant && c.isVariant());
const mains    = allComponents.filter(c => !(c.isVariant && c.isVariant()));

console.log(`Scan "${libName}" : ${mains.length} composants, ${variants.length} variants`);

// ─── 3. Construction du catalogue ────────────────────────────────────────────

function parseVariantProps(variant) {
  // Les variants Penpot exposent leurs propriétés "axe=valeur, axe=valeur"
  // soit via .variantProperties, soit encodées dans le nom
  if (variant.variantProperties) return variant.variantProperties;
  const name = variant.name ?? '';
  const props = {};
  name.split(',').forEach(pair => {
    const [k, v] = pair.split('=').map(s => s?.trim());
    if (k && v) props[k] = v;
  });
  return props;
}

const catalog = mains.map(comp => {
  const path  = comp.path ?? '';
  const fullName = path ? `${path}/${comp.name}` : comp.name;

  // Variants rattachés à ce composant
  const compVariants = variants.filter(v =>
    (v.variantId && v.variantId === comp.id) ||
    (v.path === comp.path && (v.name ?? '').startsWith(comp.name)));

  // Axes de variants : union des clés, ORDRE PRÉSERVÉ (index positionnel)
  const axes = [];
  const axisValues = {};
  compVariants.forEach(v => {
    Object.entries(parseVariantProps(v)).forEach(([axis, value]) => {
      if (!axes.includes(axis)) { axes.push(axis); axisValues[axis] = new Set(); }
      axisValues[axis].add(value);
    });
  });

  // Dimensions du main instance
  let width = null, height = null;
  try {
    const inst = comp.mainInstance ? comp.mainInstance() : null;
    if (inst) { width = Math.round(inst.width); height = Math.round(inst.height); }
  } catch (e) { /* certains composants n'ont pas d'instance accessible */ }

  return {
    id: comp.id,
    name: comp.name,
    path,
    fullName,
    width, height,
    variantCount: compVariants.length,
    // ⚠️ L'ORDRE de ce tableau définit l'index pour switchVariant(index, value)
    variantAxes: axes.map((axis, index) => ({
      index,
      axis,
      values: [...axisValues[axis]],
    })),
  };
});

// ─── 4. Inférence des conventions ────────────────────────────────────────────

const groups = [...new Set(catalog.map(c => c.path).filter(Boolean))];
const stateLike = ['enabled', 'hovered', 'focused', 'pressed', 'disabled',
                   'default', 'hover', 'focus', 'active', 'error'];
const sizeLike  = ['xs', 'sm', 'md', 'lg', 'xl', 'small', 'medium', 'large'];

const conventions = {
  hierarchySeparator: '/',
  groups,
  detectedStateAxis: null,
  detectedSizeAxis: null,
};

catalog.forEach(c => {
  c.variantAxes.forEach(a => {
    const vals = a.values.map(v => v.toLowerCase());
    if (!conventions.detectedStateAxis && vals.some(v => stateLike.includes(v)))
      conventions.detectedStateAxis = a.axis;
    if (!conventions.detectedSizeAxis && vals.some(v => sizeLike.includes(v)))
      conventions.detectedSizeAxis = a.axis;
  });
});

// ─── 5. Manifest final ───────────────────────────────────────────────────────

const manifest = {
  $schema: 'penpot-library-mapper/manifest-v1',
  librarySlug: slug,
  libraryName: libName,
  source: LIBRARY,
  generatedAt: new Date().toISOString(),
  componentCount: catalog.length,
  conventions,
  components: catalog.sort((a, b) => a.fullName.localeCompare(b.fullName)),
};

console.log('\n══════ MANIFEST ══════\n');
console.log(JSON.stringify(manifest, null, 2));

// ─── Persistance via pluginData (natif Penpot — survit aux rechargements) ──
// ⚠️ Préférer pluginData à window.storage — plus fiable et natif au plugin
const MANIFEST_KEY = `library-mapper:manifest:${slug}`;
const manifestJson = JSON.stringify(manifest);

try {
  // pluginData persiste dans le fichier Penpot lui-même
  penpot.currentPage.setPluginData(MANIFEST_KEY, manifestJson);
  console.log(`\n✅ Manifest sauvegardé via pluginData (clé: ${MANIFEST_KEY})`);
  console.log(`   Pour le récupérer : penpot.currentPage.getPluginData('${MANIFEST_KEY}')`);
} catch(e) {
  // Fallback : afficher uniquement (copie manuelle)
  console.warn(`⚠️ pluginData non disponible : ${e.message}`);
  console.log(`📁 Copier le JSON ci-dessus dans : manifests/${slug}-manifest.json`);
}

// Résumé lisible
console.log('\n══════ RÉSUMÉ ══════');
console.table(catalog.map(c => ({
  composant: c.fullName,
  variants: c.variantCount,
  axes: c.variantAxes.map(a => `[${a.index}] ${a.axis}(${a.values.length})`).join(' '),
  taille: c.width ? `${c.width}×${c.height}` : '—',
})));
if (conventions.detectedStateAxis) console.log(`Axe d'état détecté : "${conventions.detectedStateAxis}"`);
if (conventions.detectedSizeAxis)  console.log(`Axe de taille détecté : "${conventions.detectedSizeAxis}"`);
