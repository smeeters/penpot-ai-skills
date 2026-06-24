/**
 * LIBRARY MAPPER — INSTANTIATE
 * Demande résolue → instance de bibliothèque configurée (switchVariant).
 *
 * Usage : coller dans penpot:execute_code, après avoir collé le MANIFEST
 *         (généré par catalog-library.js) dans la constante ci-dessous.
 *
 * Gotchas intégrés :
 *  - switchVariant(index, value) : index lu depuis manifest.variantAxes[].index
 *  - texte d'instance non détachée = lié au master → DETACH_APPROVED requis
 *  - penpot.selection = [instance] en fin
 */

// ─── Configuration de la demande ──────────────────────────────────────────────

const MANIFEST = null;            // ← coller ici l'objet manifest JSON
const REQUEST = {
  component: 'Button/Outlined',   // fullName, name, ou terme approchant
  variants: {                     // axe → valeur (axes du manifest)
    // state: 'hovered',
    // size: 'sm',
  },
  position: { x: 0, y: 0 },
  label: null,                    // nouveau texte du label (déclenche detach si nécessaire)
};
const DETACH_APPROVED = false;    // ← true uniquement avec accord explicite

// ─── 1. Résolution du composant ───────────────────────────────────────────────

if (!MANIFEST) {
  // ─── Tentative de chargement depuis pluginData ──────────────────────────────
  // Le manifest peut avoir été sauvegardé par catalog-library.js via pluginData
  let loaded = null;
  try {
    const page = penpot.currentPage;
    // Chercher un manifest dans pluginData de la page courante
    const keys = ['local']; // slugs connus — adapter si plusieurs libs
    for (const slug of keys) {
      const key  = `library-mapper:manifest:${slug}`;
      const data = page.getPluginData(key);
      if (data) { loaded = JSON.parse(data); break; }
    }
  } catch(e) { /* pluginData non disponible */ }

  if (!loaded) throw new Error("❌ Coller le manifest (catalog-library.js) dans MANIFEST, ou relancer catalog-library.js pour le sauvegarder via pluginData.");
  console.log(`✅ Manifest chargé depuis pluginData : ${loaded.libraryName}`);
  // Utiliser le manifest chargé
  Object.assign(REQUEST, { _manifest: loaded });
}

// Manifest actif : fourni ou chargé depuis pluginData
const activeManifest = REQUEST._manifest ?? MANIFEST;

function score(query, candidate) {
  const q = query.toLowerCase(), c = candidate.toLowerCase();
  if (c === q) return 1;
  if (c.includes(q) || q.includes(c)) return 0.8;
  const qTokens = q.split(/[\s/_-]+/), cTokens = c.split(/[\s/_-]+/);
  const hits = qTokens.filter(t => cTokens.some(ct => ct.includes(t) || t.includes(ct))).length;
  return hits / Math.max(qTokens.length, 1) * 0.7;
}

const ranked = activeManifest.components
  .map(c => ({ c, s: Math.max(score(REQUEST.component, c.fullName), score(REQUEST.component, c.name)) }))
  .sort((a, b) => b.s - a.s);

const best = ranked[0];
if (!best || best.s < 0.5) {
  console.error(`❌ "${REQUEST.component}" introuvable dans "${activeManifest.libraryName}".`);
  console.error('Les plus proches :');
  ranked.slice(0, 3).forEach(r => console.error(`  ${r.c.fullName} (score ${r.s.toFixed(2)})`));
  throw new Error('Composant non résolu — règle de non-substitution : demander à l’utilisateur.');
}
if (best.s < 0.8) console.warn(`⚠️ Match approximatif : "${best.c.fullName}" (score ${best.s.toFixed(2)}) — confirmer avant usage en production.`);

const entry = best.c;
console.log(`✅ Résolu : "${REQUEST.component}" → ${entry.fullName} (${entry.variantCount} variants)`);

// ─── 2. Récupération du composant et instanciation ───────────────────────────

const lib = activeManifest.source === 'local'
  ? penpot.library.local
  : (penpot.library.connected ?? []).find(l => (l.name ?? '') === activeManifest.libraryName);

const comp = (lib.components ?? []).find(c => c.id === entry.id)
  ?? (lib.components ?? []).find(c => (c.path ? `${c.path}/${c.name}` : c.name) === entry.fullName);
if (!comp) throw new Error(`❌ Composant "${entry.fullName}" absent de la bibliothèque — manifest périmé ? Relancer CATALOG.`);

const instance = comp.instance();
instance.x = REQUEST.position.x;
instance.y = REQUEST.position.y;

// ─── 3. Configuration des variants ────────────────────────────────────────────

const applied = [], failed = [];
Object.entries(REQUEST.variants ?? {}).forEach(([axis, value]) => {
  const axisDef = entry.variantAxes.find(a => a.axis === axis);
  if (!axisDef) { failed.push(`axe "${axis}" inconnu (axes: ${entry.variantAxes.map(a => a.axis).join(', ')})`); return; }
  if (!axisDef.values.includes(value)) {
    failed.push(`"${value}" hors valeurs de "${axis}" (${axisDef.values.join(', ')})`); return;
  }
  try {
    // ⚠️ index POSITIONNEL depuis le manifest — jamais deviné
    instance.switchVariant(axisDef.index, value);
    applied.push(`${axis}=${value} (index ${axisDef.index})`);
  } catch (e) { failed.push(`switchVariant(${axisDef.index}, "${value}") : ${e.message}`); }
});

// ─── 4. Label (gestion du detach) ─────────────────────────────────────────────

if (REQUEST.label) {
  const findText = (s) => {
    if (s.type === 'text') return s;
    for (const c of (s.children ?? [])) { const t = findText(c); if (t) return t; }
    return null;
  };
  const textShape = findText(instance);
  if (textShape) {
    if (!DETACH_APPROVED) {
      console.warn('⏸ Changement de label demandé : nécessite .detach() (irréversible).');
      console.warn('   Passer DETACH_APPROVED = true après accord utilisateur.');
    } else {
      instance.detach();
      textShape.characters = REQUEST.label;
      console.log(`✏️ Label : "${REQUEST.label}" (instance détachée)`);
    }
  }
}

// ─── 5. Rapport ───────────────────────────────────────────────────────────────

penpot.selection = [instance]; // localiser le résultat dans l'UI

console.log(`\n══════ INSTANCIATION ══════`);
console.log(`Bibliothèque : ${activeManifest.libraryName}`);
console.log(`Composant    : ${entry.fullName}`);
console.log(`Position     : ${REQUEST.position.x}, ${REQUEST.position.y}`);
if (applied.length) console.log(`Variants     : ${applied.join(' | ')}`);
if (failed.length)  console.warn(`❌ Échecs    : ${failed.join(' | ')}`);
