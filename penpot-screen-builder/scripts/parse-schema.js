/**
 * SCREEN BUILDER — PARSE
 * Analyse la structure JSON d'entrée et produit un mapping champ → composant.
 *
 * Usage : exécuter en STEP 1 avant build-screen.js.
 * Coller la structure JSON dans INPUT_DATA.
 * Coller le manifest penpot-library-mapper dans MANIFEST.
 */

// ─── Input ────────────────────────────────────────────────────────────────────

const INPUT_DATA = null; // ← coller ici la structure JSON (objet ou array)
const MANIFEST   = null; // ← coller ici le manifest catalog-library.js
const LOCALE     = 'fr-FR';
const BREAKPOINT = 'desktop'; // 'mobile' | 'tablet' | 'desktop'

if (!INPUT_DATA) throw new Error('❌ Coller la structure JSON dans INPUT_DATA.');
if (!MANIFEST)   throw new Error('❌ Coller le manifest library-mapper dans MANIFEST.');

// ─── Détection du type d'écran ────────────────────────────────────────────────

function detectScreenType(data) {
  if (Array.isArray(data)) return 'list';
  const keys = Object.keys(data);
  const hasMetrics = keys.some(k => typeof data[k] === 'number' && k !== 'id');
  const hasNested  = keys.some(k => typeof data[k] === 'object' && data[k] !== null);
  const hasFields  = keys.some(k => ['name', 'email', 'label', 'title', 'value'].includes(k));
  if (hasMetrics && keys.length <= 8) return 'dashboard';
  if (hasFields || keys.length <= 12) return 'form';
  if (hasNested) return 'detail';
  return 'form'; // défaut
}

const screenType = detectScreenType(INPUT_DATA);
console.log(`Type d'écran détecté : ${screenType}`);

// ─── Inférence de type de champ ───────────────────────────────────────────────

function inferFieldType(key, value) {
  const k = key.toLowerCase();
  if (k.includes('email'))   return 'email';
  if (k.includes('phone') || k.includes('tel')) return 'phone';
  if (k.includes('password') || k.includes('secret')) return 'password';
  if (k.includes('date') || k.includes('_at')) return 'date';
  if (k.includes('url') || k.includes('link')) return 'url';
  if (k.includes('price') || k.includes('amount') || k.includes('cost')) return 'currency';
  if (k.includes('count') || k.includes('total') || k.includes('qty')) return 'number';
  if (k === 'id' || k.endsWith('_id')) return 'id';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (Array.isArray(value)) return 'enum';
  if (typeof value === 'object' && value !== null) return 'nested';
  return 'string';
}

// ─── Contenu réaliste fr-FR ───────────────────────────────────────────────────

const REALISTIC_CONTENT = {
  'string':     'Valeur exemple',
  'string/name': 'Jean Dupont',
  'email':      'jean.dupont@acme.fr',
  'phone':      '+33 6 12 34 56 78',
  'password':   '••••••••••',
  'date':       '14/06/2026',
  'url':        'https://acme.fr',
  'currency':   '1 249,00 €',
  'number':     '42',
  'id':         'USR-2847',
  'boolean':    'Activé',
};

function getContent(type, key, value) {
  const k = key.toLowerCase();
  if (k.includes('name') || k.includes('nom')) return REALISTIC_CONTENT['string/name'];
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  if (value !== null && value !== undefined && typeof value !== 'object')
    return String(value);
  return REALISTIC_CONTENT[type] ?? 'Exemple';
}

// ─── Mapping composant depuis le manifest ─────────────────────────────────────

const COMPONENT_MAP = {
  'string':   'TextField',
  'email':    'TextField',
  'phone':    'TextField',
  'password': 'TextField',
  'date':     'TextField',
  'url':      'TextField',
  'currency': 'TextField',
  'number':   'TextField',
  'id':       'TextField',
  'enum':     'Select',
  'boolean':  'Switch',
  'nested':   null, // section → traitement récursif
};

function scoreMatch(query, candidate) {
  const q = query.toLowerCase(), c = candidate.toLowerCase();
  if (c === q) return 1;
  if (c.includes(q) || q.includes(c)) return 0.8;
  const qT = q.split(/[/\-_]/), cT = c.split(/[/\-_]/);
  return qT.filter(t => cT.some(ct => ct.includes(t))).length / Math.max(qT.length, 1) * 0.6;
}

function resolveComponent(type, manifest) {
  const target = COMPONENT_MAP[type];
  if (!target) return null;
  const ranked = (manifest.components ?? [])
    .map(c => ({ c, s: Math.max(scoreMatch(target, c.name), scoreMatch(target, c.fullName)) }))
    .sort((a, b) => b.s - a.s);
  const best = ranked[0];
  return best?.s >= 0.5 ? best.c : null;
}

// ─── Construction du mapping ──────────────────────────────────────────────────

const LAYOUT_WIDTHS = { mobile: 343, tablet: 600, desktop: 480 };
const WIDTH = LAYOUT_WIDTHS[BREAKPOINT];

function flattenFields(data, prefix = '') {
  const fields = [];
  if (Array.isArray(data)) {
    // List → prendre le premier élément comme template
    if (data.length > 0) flattenFields(data[0], prefix).forEach(f => fields.push(f));
    return fields;
  }
  Object.entries(data).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const type    = inferFieldType(key, value);
    if (type === 'nested' && typeof value === 'object') {
      flattenFields(value, fullKey).forEach(f => fields.push(f));
    } else {
      fields.push({ key: fullKey, label: humanize(key), type, value, rawKey: key });
    }
  });
  return fields;
}

function humanize(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, c => c.toUpperCase());
}

const fields = flattenFields(INPUT_DATA);

// Ajouter les boutons d'action pour les formulaires
if (screenType === 'form') {
  fields.push(
    { key: '_cancel', label: 'Annuler', type: 'action-secondary', value: null, rawKey: '_cancel' },
    { key: '_submit', label: 'Enregistrer', type: 'action-primary', value: null, rawKey: '_submit' }
  );
}

// ─── Rapport de mapping ───────────────────────────────────────────────────────

const COMPONENT_MAP_ACTIONS = {
  'action-primary':   'Button',
  'action-secondary': 'Button',
};

const mapping = fields.map(f => {
  const compTarget = COMPONENT_MAP_ACTIONS[f.type] ?? COMPONENT_MAP[f.type];
  const comp       = compTarget ? resolveComponent(f.type.startsWith('action') ? 'Button' : f.type, MANIFEST) : null;
  const content    = getContent(f.type, f.rawKey, f.value);
  const variant    = f.type === 'action-primary'
    ? { state: 'enabled', type: 'Contained' }
    : f.type === 'action-secondary'
    ? { state: 'enabled', type: 'Text' }
    : { state: 'enabled', size: 'Medium' };
  const missing    = !comp;
  return { ...f, component: comp?.fullName ?? `❌ ${compTarget} manquant`, variant, content, missing };
});

console.log(`\n══════ MAPPING CHAMP → COMPOSANT ══════`);
console.log(`Breakpoint : ${BREAKPOINT} (${WIDTH}px) · Écran : ${screenType} · Locale : ${LOCALE}`);
console.table(mapping.map(m => ({
  champ: m.key, label: m.label, type: m.type,
  composant: m.component,
  contenu: m.content.slice(0, 30),
  manquant: m.missing ? '❌' : '✅',
})));

const missing = mapping.filter(m => m.missing);
if (missing.length)
  console.warn(`\n⚠️ ${missing.length} composant(s) introuvable(s) dans le manifest.`);

const MAPPING_JSON = JSON.stringify({ screenType, breakpoint: BREAKPOINT, width: WIDTH, fields: mapping }, null, 2);
console.log(`\n══════ MAPPING_JSON — copier pour build-screen.js ══════`);
console.log(MAPPING_JSON);
