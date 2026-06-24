/**
 * TOKENS DTCG — STEP 1: CONSOLIDATE
 * Merge les 57 fichiers d'export Tokens Studio en un seul tokens.json
 * conforme DTCG, prêt pour Style Dictionary v4.
 *
 * Usage : node scripts/consolidate.js
 * Input : dossier tokens-export/ (export depuis Penpot/Tokens Studio)
 * Output: tokens/tokens.json
 *
 * Particularités gérées :
 *  - tokenSetOrder depuis $metadata.json (ordre de merge respecté)
 *  - Sous-dossiers 03-Component/Base/, Small/, Medium/, Large/
 *  - Tokens typography composites (objet $value) → éclatés en sous-tokens
 *  - Thèmes : seuls NG-small et NG-Medium ont des sets actifs
 *  - Switch+ (caractère spécial dans le nom de fichier) → géré
 */

const fs   = require('fs');
const path = require('path');

const EXPORT_DIR = process.argv[2] ?? './tokens-export';
const OUTPUT_DIR = './tokens';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'tokens.json');

// ─── 1. Lire l'ordre des sets ─────────────────────────────────────────────────

const metadata = JSON.parse(
  fs.readFileSync(path.join(EXPORT_DIR, '$metadata.json'), 'utf8')
);
const setOrder = metadata.tokenSetOrder ?? [];
console.log(`Sets à merger : ${setOrder.length}`);

// ─── 2. Mapper setName → chemin de fichier ────────────────────────────────────

function setNameToPath(setName) {
  // "03-Component/Base/Button" → "03-Component/Base/Button.json"
  // "03-Component/Medium/Switch+" → gérer le caractère spécial
  return path.join(EXPORT_DIR, `${setName}.json`);
}

// ─── 3. Éclater les tokens typography composites ─────────────────────────────

function expandTypography(node, parentKey = '') {
  if (typeof node !== 'object' || node === null) return node;

  // Token typography avec $value composite (objet)
  if ('$value' in node && node.$type === 'typography' && typeof node.$value === 'object') {
    const val = node.$value;
    const expanded = {};
    if (val.fontFamilies) expanded.fontFamily = {
      $value: Array.isArray(val.fontFamilies) ? val.fontFamilies[0] : val.fontFamilies,
      $type: 'fontFamilies', $description: node.$description ?? ''
    };
    if (val.fontSizes) expanded.fontSize = {
      $value: val.fontSizes,
      $type: 'fontSizes', $description: ''
    };
    if (val.fontWeights) expanded.fontWeight = {
      $value: val.fontWeights,
      $type: 'fontWeights', $description: ''
    };
    if (val.lineHeights) expanded.lineHeight = {
      $value: val.lineHeights,
      $type: 'lineHeights', $description: ''
    };
    if (val.letterSpacing) expanded.letterSpacing = {
      $value: val.letterSpacing,
      $type: 'letterSpacing', $description: ''
    };
    if (val.textCase && val.textCase !== 'none') expanded.textCase = {
      $value: val.textCase,
      $type: 'textCase', $description: ''
    };
    return expanded;
  }

  // Token avec $value simple — laisser tel quel
  if ('$value' in node) return node;

  // Nœud intermédiaire — récurser
  const result = {};
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) { result[k] = v; continue; }
    const expanded = expandTypography(v, k);
    // Si expandTypography retourne un objet avec des sous-clés (typography éclaté),
    // les injecter directement dans le nœud parent
    if (typeof expanded === 'object' && !('$value' in expanded) && expanded !== null
        && v.$type === 'typography') {
      result[k] = expanded; // garder le nœud nommé avec les sous-tokens
    } else {
      result[k] = expanded;
    }
  }
  return result;
}

// ─── 4. Deep merge ────────────────────────────────────────────────────────────

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (k.startsWith('$')) continue; // ignorer les méta-clés au niveau root
    if (typeof v === 'object' && v !== null && !('$value' in v)
        && typeof target[k] === 'object' && target[k] !== null && !('$value' in target[k])) {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

// ─── 5. Merger dans l'ordre ───────────────────────────────────────────────────

const merged = {};
let loaded = 0, missing = 0;

for (const setName of setOrder) {
  const filePath = setNameToPath(setName);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ Fichier manquant : ${filePath}`);
    missing++;
    continue;
  }
  try {
    const raw  = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const expanded = expandTypography(raw);
    deepMerge(merged, expanded);
    loaded++;
  } catch (e) {
    console.warn(`  ❌ Erreur lecture ${filePath} : ${e.message}`);
  }
}

console.log(`Sets chargés : ${loaded}/${setOrder.length} (${missing} manquants)`);

// ─── 6. Ajouter les métadonnées DTCG ─────────────────────────────────────────

const output = {
  $schema: 'https://design-tokens.github.io/community-group/format/',
  $metadata: {
    source: 'Penpot Tokens Studio export',
    generated: new Date().toISOString(),
    totalTokens: countTokens(merged),
    sets: loaded,
  },
  ...merged,
};

function countTokens(node) {
  if (typeof node !== 'object' || node === null) return 0;
  if ('$value' in node) return 1;
  return Object.values(node).reduce((a, v) => a + countTokens(v), 0);
}

// ─── 7. Écrire le fichier de sortie ──────────────────────────────────────────

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');

const stats = fs.statSync(OUTPUT_FILE);
console.log(`\n✅ tokens.json généré`);
console.log(`   Tokens : ${output.$metadata.totalTokens}`);
console.log(`   Taille : ${(stats.size / 1024).toFixed(1)} KB`);
console.log(`   Chemin : ${OUTPUT_FILE}`);
console.log(`\n📋 Étape suivante : npm run build:tokens`);
