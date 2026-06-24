/**
 * SCREEN BUILDER — BUILD
 * Construit l'écran Penpot depuis le MAPPING_JSON de parse-schema.js.
 * Utilise exclusivement les composants du manifest et les tokens existants.
 *
 * ⚠️ IMPORTANT : exécuter depuis la page cible dans Penpot.
 *    penpot.create*() crée toujours sur la page COURANTE — si currentPage
 *    diffère de la page cible, les enfants s'éparpillent (bug cross-page).
 *
 * Gotchas intégrés :
 *  - penpot.createBoard() et non createFrame() (bug #6)
 *  - page.root.appendChild() et non page.appendChild() (bug session 1)
 *  - switchVariant() via typeof check
 *  - library.connected[].components retourne 0 — utiliser local+connected (bug #7)
 *  - noms token avec suffixe type (bug #8)
 *  - penpot.create*() crée sur la page COURANTE (bug cross-page)
 *  - remove() inopérant sur shapes d'une page non-courante
 */

const MAPPING_INPUT = null; // ← coller ici le MAPPING_JSON de parse-schema.js
const MANIFEST      = null; // ← coller ici le manifest library-mapper
const SCREEN_NAME   = 'Screen';
const POSITION      = { x: 0, y: 0 };
// Nom de la page cible — le script vérifie qu'on est bien dessus
const TARGET_PAGE   = null; // ← ex: 'Screen-Builder' — null = pas de vérification

if (!MAPPING_INPUT) throw new Error('❌ Coller le MAPPING_JSON dans MAPPING_INPUT.');

// ─── Garde page courante ──────────────────────────────────────────────────────
// FIX cross-page : penpot.create*() crée sur la page COURANTE
// → Vérifier qu'on est bien sur la bonne page avant de créer quoi que ce soit
if (TARGET_PAGE && penpot.currentPage.name !== TARGET_PAGE) {
  throw new Error(
    `❌ Page courante : "${penpot.currentPage.name}"\n` +
    `   Naviguer sur "${TARGET_PAGE}" dans Penpot avant d'exécuter ce script.`
  );
}

const mapping = typeof MAPPING_INPUT === 'string' ? JSON.parse(MAPPING_INPUT) : MAPPING_INPUT;
const { screenType, width, fields } = mapping;

// ─── Résolution des tokens ────────────────────────────────────────────────────

const tokLib = penpot.library.local.tokens ?? penpot.tokens;
const allTokens = new Map();
(tokLib?.sets ?? []).forEach(s => (s.tokens ?? []).forEach(t => allTokens.set(t.name, t)));

function resolveToken(name) {
  const t = allTokens.get(name);
  if (!t) return null;
  let v = t.value, d = 0;
  while (/^\{.+\}$/.test(String(v)) && d < 8) {
    const m = /^\{(.+)\}$/.exec(String(v));
    const ref = allTokens.get(m[1]);
    if (!ref) break;
    v = ref.value; d++;
  }
  return String(v);
}

const bgColor = resolveToken('dark.background.default') ?? '#121212';

// ─── Résolution du composant depuis le manifest ───────────────────────────────

// FIX B3 (API-6) : library.local.components peut être vide (0 composants)
// → chercher aussi dans library.connected
const lib = penpot.library.local;
const allComponents = [
  ...(lib.components ?? []),
  ...(penpot.library.connected ?? []).flatMap(l => l.components ?? []),
];

function getComponent(fullName) {
  const entry = (MANIFEST.components ?? []).find(c => c.fullName === fullName || c.name === fullName);
  if (!entry) return null;
  return allComponents.find(c => c.id === entry.id)
    ?? allComponents.find(c => (c.path ? `${c.path}/${c.name}` : c.name) === fullName);
}

function applyVariant(instance, compEntry, variantRequests) {
  if (typeof instance.switchVariant !== 'function') return;
  Object.entries(variantRequests).forEach(([axis, value]) => {
    const axisDef = (compEntry?.variantAxes ?? []).find(a => a.axis === axis);
    if (!axisDef) return;
    if (!axisDef.values.includes(value)) return;
    try { instance.switchVariant(axisDef.index, value); } catch(e) { /* ignore */ }
  });
}

// ─── Création du frame principal ──────────────────────────────────────────────

const page   = penpot.currentPage;

// FIX idempotence : supprimer le board existant du même nom avant de recréer
// ⚠️ remove() ne fonctionne qu'on la page COURANTE (limitation API)
const existing = (page.root.children ?? []).find(s => s.name === SCREEN_NAME);
if (existing) {
  try {
    page.root.removeChild(existing);
    console.log(`🗑️ Board existant "${SCREEN_NAME}" supprimé avant re-création.`);
  } catch(e) {
    console.warn(`⚠️ Impossible de supprimer "${SCREEN_NAME}" : ${e.message}`);
  }
}

const screen = penpot.createBoard();
screen.name  = SCREEN_NAME;
screen.x     = POSITION.x;
screen.y     = POSITION.y;
screen.resize(width, 800); // hauteur ajustée après ajout des enfants
screen.fills = [{ color: bgColor }];

// FIX API-1 : .flex = {...} silencieusement ignoré → addFlexLayout() + prop par prop
// FIX padding : après addFlexLayout(), toujours lire board.flex pour assigner
// les paddings — board.flex peut être null avant l'appel addFlexLayout()
function applyFlex(board, props) {
  try { board.addFlexLayout(); } catch(e) { /* déjà présent — ignorer */ }
  // ⚠️ Lire board.flex APRÈS addFlexLayout() — pas avant
  const f = board.flex;
  if (!f) {
    console.warn(`⚠️ applyFlex : board.flex toujours null après addFlexLayout() sur "${board.name}"`);
    return;
  }
  if (props.dir            != null) f.dir            = props.dir;
  if (props.alignItems     != null) f.alignItems     = props.alignItems
    .replace('flex-start', 'start').replace('flex-end', 'end');
  if (props.justifyContent != null) f.justifyContent = props.justifyContent
    .replace('flex-start', 'start').replace('flex-end', 'end');
  if (props.paddingTop     != null) f.paddingTop     = props.paddingTop;
  if (props.paddingBottom  != null) f.paddingBottom  = props.paddingBottom;
  if (props.paddingLeft    != null) f.paddingLeft    = props.paddingLeft;
  if (props.paddingRight   != null) f.paddingRight   = props.paddingRight;
  if (props.rowGap         != null) f.rowGap         = props.rowGap;
  if (props.columnGap      != null) f.columnGap      = props.columnGap;
}

// Layout flex vertical du frame principal
applyFlex(screen, {
  dir: 'column',
  alignItems: 'stretch',
  paddingTop: 24, paddingBottom: 24,
  paddingLeft: 24, paddingRight: 24,
  rowGap: screenType === 'form' ? 16 : 0,
});

page.root.appendChild(screen);

// LOT 2 — Police sécurisée (fontWeight 700 uniquement, pas 600)
function setFontSafe(shape, font, fallback = 'Roboto') {
  try {
    shape.fontFamily = font;
    if (shape.fontFamily !== font) shape.fontFamily = fallback;
  } catch(e) { try { shape.fontFamily = fallback; } catch(e2) {} }
}

// ─── Fallbacks auto-layout (sans manifest) ───────────────────────────────────
// Bonne pratique Penpot : boards auto-layout, pas de rectangles flottants

function createFieldFallback(field) {
  // Board conteneur : column auto-layout (label + input)
  const fieldBoard = penpot.createBoard();
  fieldBoard.name = `field-${field.rawKey}`;
  fieldBoard.fills = [];
  applyFlex(fieldBoard, { dir: 'column', alignItems: 'stretch', rowGap: 6,
    paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 });

  // Label au-dessus
  const label = penpot.createText(field.label || field.rawKey);
  label.name    = `${field.rawKey}-label`;
  label.fontSize = 12;
  label.fontWeight = 400;
  label.fills   = [{ color: resolveToken('dark.text.secondary') ?? '#9e9e9e' }];
  setFontSafe(label, 'Roboto');
  fieldBoard.appendChild(label);

  if (field.type === 'boolean') {
    // Switch fallback : row avec toggle + label
    const switchRow = penpot.createBoard();
    switchRow.name = `${field.rawKey}-switch`;
    switchRow.fills = [];
    applyFlex(switchRow, { dir: 'row', alignItems: 'center', columnGap: 8,
      paddingTop: 8, paddingBottom: 8, paddingLeft: 0, paddingRight: 0 });

    const toggle = penpot.createBoard();
    toggle.name   = `${field.rawKey}-toggle`;
    toggle.resize(36, 20);
    toggle.borderRadius = 10;
    toggle.fills  = [{ color: field.content === 'Activé'
      ? (resolveToken('dark.primary.main') ?? '#1976d2')
      : (resolveToken('dark.action.disabled') ?? '#555') }];
    switchRow.appendChild(toggle);

    const val = penpot.createText(field.content ?? 'Activé');
    val.name  = `${field.rawKey}-value`;
    val.fontSize = 14;
    val.fills = [{ color: resolveToken('dark.text.primary') ?? '#ffffff' }];
    setFontSafe(val, 'Roboto');
    switchRow.appendChild(val);
    fieldBoard.appendChild(switchRow);

  } else if (field.type.startsWith('action')) {
    // Bouton fallback : board auto-layout row avec fond coloré
    const isPrimary = field.type === 'action-primary';
    const btn = penpot.createBoard();
    btn.name  = `btn-${field.rawKey}`;
    btn.borderRadius = 4;
    btn.fills = [{ color: isPrimary
      ? (resolveToken('dark.primary.main') ?? '#1976d2')
      : 'transparent' }];
    if (!isPrimary) {
      btn.strokes = [{ color: resolveToken('dark.text.secondary') ?? '#9e9e9e',
        strokeType: 'inner', strokeWidth: 1 }];
    }
    applyFlex(btn, { dir: 'row', alignItems: 'center',
      paddingTop: 8, paddingBottom: 8, paddingLeft: 16, paddingRight: 16 });

    const btnLabel = penpot.createText(field.content ?? field.label);
    btnLabel.name  = `${field.rawKey}-label`;
    btnLabel.fontSize   = 14;
    btnLabel.fontWeight = 500;
    btnLabel.fills = [{ color: isPrimary
      ? '#ffffff'
      : (resolveToken('dark.text.primary') ?? '#ffffff') }];
    setFontSafe(btnLabel, 'Roboto');
    btn.appendChild(btnLabel);
    fieldBoard.appendChild(btn);

  } else {
    // Champ texte fallback : board auto-layout row avec border
    const input = penpot.createBoard();
    input.name  = `${field.rawKey}-input`;
    input.borderRadius = 4;
    input.fills = [{ color: resolveToken('dark.background.paper') ?? '#1e1e1e' }];
    input.strokes = [{ color: resolveToken('dark.divider') ?? '#444',
      strokeType: 'inner', strokeWidth: 1 }];
    applyFlex(input, { dir: 'row', alignItems: 'center',
      paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12 });

    const val = penpot.createText(field.content ?? ' ');
    val.name  = `${field.rawKey}-value`;
    val.fontSize = 14;
    val.fills = [{ color: field.content
      ? (resolveToken('dark.text.primary') ?? '#ffffff')
      : (resolveToken('dark.text.disabled') ?? '#555') }];
    setFontSafe(val, 'Roboto');
    input.appendChild(val);
    fieldBoard.appendChild(input);
  }

  return fieldBoard;
}

// ─── Construction par type d'écran ───────────────────────────────────────────

const created  = [];
const failures = [];

// ── FORMULAIRE ──
if (screenType === 'form') {
  // Grouper les boutons d'action à part
  const dataFields   = fields.filter(f => !f.type.startsWith('action'));
  const actionFields = fields.filter(f => f.type.startsWith('action'));

  let currentSection = null;

  dataFields.forEach(field => {
    // Séparateur de section pour les clés imbriquées
    const section = field.key.includes('.') ? field.key.split('.')[0] : null;
    if (section && section !== currentSection) {
      currentSection = section;
      const sTitle = penpot.createText(
        section.charAt(0).toUpperCase() + section.slice(1).replace(/_/g, ' ')
      );
      sTitle.name      = `section-title-${section}`;
      sTitle.fontSize  = 14;
      sTitle.fontWeight = 500;
      sTitle.fills     = [{ color: resolveToken('dark.text.primary') ?? '#ffffff' }];
      setFontSafe(sTitle, 'Roboto');
      screen.appendChild(sTitle);
    }

    if (field.missing) {
      const placeholder = penpot.createBoard();
      placeholder.name  = `[MANQUANT] ${field.label}`;
      placeholder.resize(width - 48, 56);
      placeholder.fills = [{ fillColor: '#7f1d1d', fillOpacity: 1 }];
      placeholder.borderRadius = 4;
      applyFlex(placeholder, { dir: 'row', alignItems: 'center',
        paddingTop: 0, paddingBottom: 0, paddingLeft: 12, paddingRight: 12 });
      const pt = penpot.createText(`⚠️ ${field.component} — ${field.label}`);
      pt.name = '_placeholder_label';
      pt.fills = [{ fillColor: '#ffffff', fillOpacity: 1 }];
      pt.fontSize = 11;
      placeholder.appendChild(pt);
      screen.appendChild(placeholder);
      failures.push(field.key);
      return;
    }

    // Essayer d'instancier depuis le manifest — fallback auto-layout sinon
    const compEntry = (MANIFEST?.components ?? []).find(c =>
      c.fullName === field.component || c.name === field.component);
    const comp = MANIFEST ? getComponent(field.component) : null;

    if (comp) {
      const instance = comp.instance();
      applyVariant(instance, compEntry, field.variant ?? {});
      instance.name = `field-${field.rawKey}`;
      screen.appendChild(instance);
    } else {
      // Fallback : board auto-layout structuré (bonne pratique Penpot)
      const fallback = createFieldFallback(field);
      screen.appendChild(fallback);
    }
    created.push(field.key);
  });

  // Zone boutons — row auto-layout aligné à droite
  if (actionFields.length > 0) {
    const actionsRow = penpot.createBoard();
    actionsRow.name  = 'actions-row';
    actionsRow.fills = [];
    applyFlex(actionsRow, { dir: 'row', alignItems: 'center',
      paddingTop: 8, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, columnGap: 8 });

    actionFields.forEach(field => {
      const comp = MANIFEST ? getComponent(field.component) : null;
      if (comp) {
        const instance = comp.instance();
        instance.name = `btn-${field.rawKey}`;
        actionsRow.appendChild(instance);
      } else {
        const fallback = createFieldFallback(field);
        actionsRow.appendChild(fallback);
      }
      created.push(field.key);
    });

    screen.appendChild(actionsRow);
  }
}

// ── LISTE / TABLEAU ──
if (screenType === 'list') {
  // Header
  const header = penpot.createBoard();
  header.name  = 'list-header';
  header.resize(width, 48);
  header.fills = [{ color: resolveToken('dark.background.paper') ?? '#1e1e1e' }];
  applyFlex(header, { dir: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 16, columnGap: 16 });
  screen.appendChild(header);

  // 3 lignes de données
  for (let i = 0; i < 3; i++) {
    const row = penpot.createBoard();
    row.name   = `list-row-${i}`;
    row.resize(width, 48);
    row.fills  = [{ color: i % 2 === 0
      ? (resolveToken('dark.background.default') ?? '#121212')
      : (resolveToken('dark.background.paper') ?? '#1e1e1e') }];
    applyFlex(row, { dir: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 16, columnGap: 16 });
    screen.appendChild(row);
    created.push(`row-${i}`);
  }
}

// ── DASHBOARD ──
if (screenType === 'dashboard') {
  const kpiFields = fields.filter(f => f.type === 'number' || f.type === 'currency');
  kpiFields.slice(0, 4).forEach((field, i) => {
    const card = penpot.createBoard();
    card.name  = `kpi-${field.rawKey}`;
    card.resize((width - 48 - 16 * 3) / 4, 80);
    card.fills = [{ color: resolveToken('dark.background.paper') ?? '#1e1e1e' }];
    card.borderRadius = 4;
    const label = penpot.createText(field.label);
    label.fills = [{ color: resolveToken('dark.text.secondary') ?? '#9e9e9e' }];
    label.fontSize = 12;
    const value = penpot.createText(field.content);
    value.fills = [{ color: resolveToken('dark.text.primary') ?? '#ffffff' }];
    value.fontSize = 24;
    value.fontWeight = 700;
    card.appendChild(label);
    card.appendChild(value);
    screen.appendChild(card);
    created.push(field.key);
  });
}

// ─── Ajuster la hauteur du board ──────────────────────────────────────────────
// ⚠️ BUG 1 : verticalSizing = 'auto' est invalide en API → erreur :error
// ⚠️ BUG 2 : child.y = 0 juste après appendChild en flex layout
//            (le moteur ne calcule pas les positions immédiatement)
// → Calcul basé sur des constantes, pas sur les positions réelles des enfants

const FIELD_HEIGHT   = 68;  // label 16px + gap 6px + input 46px
const TOGGLE_HEIGHT  = 56;  // label + switch row
const BUTTON_HEIGHT  = 40;  // bouton
const SECTION_HEIGHT = 28;  // titre de section
const SCREEN_PADDING = 48;  // paddingTop + paddingBottom
const SCREEN_GAP     = 16;  // rowGap

const itemCount = created.length;
const estimatedH = SCREEN_PADDING
  + (itemCount * FIELD_HEIGHT)
  + (itemCount > 0 ? (itemCount - 1) * SCREEN_GAP : 0)
  + (screenType === 'form' ? BUTTON_HEIGHT + SCREEN_GAP : 0);

screen.resize(width, Math.max(estimatedH, 200));

// ─── Rapport ─────────────────────────────────────────────────────────────────

penpot.selection = [screen];

console.log(`\n══════ SCREEN BUILDER ══════`);
console.log(`Écran : "${SCREEN_NAME}" (${screenType}, ${width}px)`);
console.log(`✅ ${created.length} éléments créés`);
if (failures.length)
  console.warn(`❌ ${failures.length} échecs : ${failures.join(', ')}`);
console.log(`\n📋 ÉTAPES SUIVANTES :`);
console.log(`1. penpot-token-pipeline APPLY → lier les tokens`);
console.log(`2. penpot-qa-checklist → vérifier ≥ 80/100`);
console.log(`3. penpot-annotation → générer le handoff`);
