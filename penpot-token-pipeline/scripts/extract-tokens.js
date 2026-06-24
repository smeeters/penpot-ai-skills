/**
 * TOKEN PIPELINE — EXTRACT
 * Composant(s) sélectionné(s) → tokens 3 niveaux (Fondation/Semantic/Component)
 *
 * Usage : coller dans penpot:execute_code après avoir sélectionné le(s) composant(s).
 * Mode : DRY RUN par défaut (rapport sans création). Passer CREATE = true après
 *        validation du checkpoint.
 *
 * Gotchas intégrés :
 *  - addSet() + toggleActive() AVANT addToken() — sinon null
 *  - tout dans UN SEUL bloc execute_code
 *  - addToken() retourne null sur duplicat → vérification d'existence d'abord
 *  - variants : filtrer .isVariant && c.isVariant()
 *  - column-reverse : ordre/paddings inversés
 */

const CREATE = false;          // ← passer à true après validation du checkpoint
const COMPONENT_NAME = null;   // null = déduit du nom de la sélection (ex: "Button")
const SIZE_SET = 'Small';      // Small | Medium | Large — pour les tokens dimensionnels

// ─── 1. Inventaire de la sélection ───────────────────────────────────────────

const sel = penpot.selection;
if (sel.length === 0) throw new Error("❌ Sélectionner au moins un composant.");

const lib = penpot.library.local;
const tokensLib = lib.tokens ?? penpot.tokens; // selon version API

// ─── 2. Index des tokens existants (résolution montante) ─────────────────────

function indexExistingTokens() {
  const index = { byValue: new Map(), byName: new Map() };
  const sets = tokensLib?.sets ?? [];
  sets.forEach(set => {
    (set.tokens ?? []).forEach(tk => {
      index.byName.set(tk.name, { set: set.name, token: tk });
      const key = `${tk.type}::${String(tk.value).toLowerCase()}`;
      if (!index.byValue.has(key)) index.byValue.set(key, []);
      index.byValue.get(key).push({ set: set.name, name: tk.name });
    });
  });
  return index;
}

const existing = indexExistingTokens();

function findMatch(type, value) {
  const key = `${type}::${String(value).toLowerCase()}`;
  const matches = existing.byValue.get(key) ?? [];
  // Priorité : Component même composant > Semantic > Fondation
  const semantic = matches.find(m => m.set.startsWith('02-Semantic'));
  const fondation = matches.find(m => m.set.startsWith('01-Fondation'));
  const component = matches.find(m => m.set.startsWith('03-Component'));
  return { component, semantic, fondation };
}

// ─── 3. Extraction récursive des propriétés visuelles ────────────────────────

function rgbaFromFill(fill) {
  if (!fill) return null;
  const op = fill.opacity != null && fill.opacity < 1 ? fill.opacity : null;
  return op ? `rgba(${fill.color},${op})` : fill.color;
}

function detectState(name) {
  const n = (name ?? '').toLowerCase();
  for (const s of ['hovered', 'hover', 'focused', 'focus', 'pressed', 'disabled', 'enabled'])
    if (n.includes(s)) return s.replace(/^hover$/, 'hovered').replace(/^focus$/, 'focused');
  return 'enabled';
}

const candidates = [];

function extract(shape, root, depth = 0) {
  if (depth > 6) return;
  const state = detectState(shape.name) !== 'enabled'
    ? detectState(shape.name)
    : detectState(root.name);
  const el = (shape.name ?? 'container').toLowerCase().replace(/\s+/g, '-');

  // Couleurs
  (shape.fills ?? []).forEach(f => {
    const v = rgbaFromFill(f);
    if (v && v !== 'transparent')
      candidates.push({ type: 'color', value: v, element: el, state, prop: 'bg', shape: shape.name });
  });
  (shape.strokes ?? []).forEach(s => {
    if (s.color)
      candidates.push({ type: 'color', value: s.color, element: el, state, prop: 'border-color', shape: shape.name });
  });

  // Radius / dimensions
  if (shape.borderRadius != null && shape.borderRadius > 0)
    candidates.push({ type: 'borderRadius', value: shape.borderRadius, element: el, state, prop: 'border-radius', shape: shape.name });

  if (depth === 0) { // dimensions du root → tokens de taille
    candidates.push({ type: 'sizing', value: Math.round(shape.height), element: el, state: null, prop: 'height', sizeLevel: true, shape: shape.name });
  }

  // Paddings flex (⚠️ column-reverse inverse les valeurs)
  const flex = shape.flex ?? shape.layoutChild ?? null;
  if (shape.flex) {
    const reversed = shape.flex.dir === 'column-reverse' || shape.flex.dir === 'row-reverse';
    const pv = reversed ? shape.flex.paddingBottom : shape.flex.paddingTop;
    const ph = reversed ? shape.flex.paddingRight : shape.flex.paddingLeft;
    if (pv != null) candidates.push({ type: 'spacing', value: pv, element: el, state: null, prop: 'padding-vertical', sizeLevel: true, shape: shape.name });
    if (ph != null) candidates.push({ type: 'spacing', value: ph, element: el, state: null, prop: 'padding-horizontal', sizeLevel: true, shape: shape.name });
  }

  // Typographie
  if (shape.type === 'text') {
    if (shape.fontSize) candidates.push({ type: 'fontSizes', value: shape.fontSize, element: el, state, prop: 'font-size', shape: shape.name });
  }

  (shape.children ?? []).forEach(c => extract(c, root, depth + 1));
}

sel.forEach(s => extract(s, s));

// ─── 4. Résolution montante + plan de création ────────────────────────────────

const compName = COMPONENT_NAME ?? (sel[0].name.split('/')[0] ?? 'component').toLowerCase().trim();
const baseSet  = `03-Component/Base/${compName.charAt(0).toUpperCase() + compName.slice(1)}`;
const sizeSet  = `03-Component/${SIZE_SET}/${compName.charAt(0).toUpperCase() + compName.slice(1)}`;

const plan = [];

candidates.forEach(c => {
  const match = findMatch(c.type, c.value);
  const stateSuffix = c.state && c.state !== 'enabled' ? `.${c.state}` : (c.state ? '.enabled' : '');
  const tokenName = c.sizeLevel
    ? `${SIZE_SET.toLowerCase()}.${compName}.${c.prop}`
    : `${compName}.${c.element}.${c.prop}${stateSuffix}`;

  if (existing.byName.has(tokenName)) {
    plan.push({ ...c, action: 'SKIP (existe)', tokenName, targetSet: existing.byName.get(tokenName).set });
  } else if (match.semantic) {
    plan.push({ ...c, action: 'CREATE component → alias semantic', tokenName,
      targetSet: c.sizeLevel ? sizeSet : baseSet, aliasTo: `{${match.semantic.name}}` });
  } else if (match.fondation) {
    plan.push({ ...c, action: '⚠️ CHAIN: créer semantic puis component', tokenName,
      targetSet: c.sizeLevel ? sizeSet : baseSet, via: match.fondation.name });
  } else {
    plan.push({ ...c, action: '❓ ORPHAN: aucun match — proposer chaîne complète', tokenName,
      targetSet: c.sizeLevel ? sizeSet : baseSet });
  }
});

console.table(plan.map(p => ({
  token: p.tokenName, type: p.type, valeur: p.value,
  action: p.action, set: p.targetSet, alias: p.aliasTo ?? p.via ?? '—'
})));

// ─── 5. Création batchée (UN SEUL BLOC — ne pas scinder) ─────────────────────

if (CREATE) {
  const toCreate = plan.filter(p => p.action.startsWith('CREATE'));
  const setsNeeded = [...new Set(toCreate.map(p => p.targetSet))];

  setsNeeded.forEach(setName => {
    let set = (tokensLib.sets ?? []).find(s => s.name === setName);
    if (!set) {
      set = tokensLib.addSet(setName);
      set.toggleActive();           // ⚠️ OBLIGATOIRE avant addToken
    }
    toCreate.filter(p => p.targetSet === setName).forEach(p => {
      const tok = set.addToken({
        name: p.tokenName,
        type: p.type,
        value: p.aliasTo ?? String(p.value),
      });
      if (!tok) console.warn(`⚠️ null (duplicat ?) : ${p.tokenName}`);
    });
  });
  console.log(`✅ ${toCreate.length} tokens créés dans ${setsNeeded.length} set(s).`);
} else {
  const stats = plan.reduce((a, p) => { a[p.action] = (a[p.action] ?? 0) + 1; return a; }, {});
  console.log('\n📋 DRY RUN — valider le plan puis passer CREATE = true');
  console.log(stats);
}
