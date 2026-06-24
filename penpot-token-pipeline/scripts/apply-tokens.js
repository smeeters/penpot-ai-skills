/**
 * TOKEN PIPELINE — APPLY
 * Tokens (sets 03-Component) → propriétés du/des composant(s) sélectionné(s)
 *
 * Usage : coller dans penpot:execute_code après sélection.
 * Mode : DRY RUN par défaut. Passer APPLY = true après checkpoint.
 *
 * Gotchas intégrés :
 *  - shape.applyToken() → throw "check error" (bug #9162) — NE PAS UTILISER
 *  - token.applyToShapes() → no-op silencieux (bug #9162/#9641) — NE PAS UTILISER
 *    → Workaround ici : écriture directe sur shape.fills / .strokes / .borderRadius
 *  - openPage() ne change pas le viewport (bug #8520) → currentPage uniquement
 *  - instance non détachée → texte lié au master → .detach() requis (irréversible,
 *    DETACH_APPROVED doit être passé à true explicitement)
 *  - verticalSizing 'auto' ne redimensionne pas les parents → recalcul manuel
 *  - penpot.selection = [shape] en fin pour localiser le résultat
 */

const APPLY = false;             // ← true après validation du checkpoint
const DETACH_APPROVED = false;   // ← true uniquement avec accord explicite utilisateur
const COMPONENT_NAME = null;     // null = déduit de la sélection
const SIZE_SET = 'Small';        // résolution active (thème NG-small → Small)

// ─── 1. Sélection et sets cibles ──────────────────────────────────────────────

const sel = penpot.selection;
if (sel.length === 0) throw new Error("❌ Sélectionner au moins un composant.");

const tokensLib = penpot.library.local.tokens ?? penpot.tokens;
const compName = COMPONENT_NAME ?? (sel[0].name.split('/')[0] ?? '').toLowerCase().trim();
const cap = compName.charAt(0).toUpperCase() + compName.slice(1);

const baseSetName = `03-Component/Base/${cap}`;
const sizeSetName = `03-Component/${SIZE_SET}/${cap}`;

const sets = (tokensLib.sets ?? []).filter(s =>
  s.name === baseSetName || s.name === sizeSetName || s.name === '02-Semantic' || s.name === '01-Fondation'
);
const baseSet = sets.find(s => s.name === baseSetName);
const sizeSet = sets.find(s => s.name === sizeSetName);

if (!baseSet && !sizeSet)
  throw new Error(`❌ Aucun set trouvé pour "${cap}" (cherché: ${baseSetName}, ${sizeSetName})`);

// ─── 2. Résolution des alias jusqu'à la valeur littérale ─────────────────────

const allTokens = new Map();
(tokensLib.sets ?? []).forEach(s => (s.tokens ?? []).forEach(t => allTokens.set(t.name, t)));

function resolve(value, depth = 0) {
  if (depth > 8) return value; // boucle d'alias
  const m = /^\{(.+)\}$/.exec(String(value).trim());
  if (!m) return value;
  const ref = allTokens.get(m[1]);
  return ref ? resolve(ref.value, depth + 1) : value;
}

// ─── 3. Table de binding : token → (élément, propriété, état) ────────────────

// Parse "button.icon.color.error.hovered" → { element:'icon', prop:'color', variant:'error', state:'hovered' }
const STATES = ['enabled', 'hovered', 'focused', 'pressed', 'disabled'];

function parseTokenName(name) {
  const parts = name.split('.');
  const state = STATES.includes(parts[parts.length - 1]) ? parts.pop() : null;
  return { component: parts[0], element: parts[1] ?? 'container',
           prop: parts[2] ?? parts[1], variant: parts[3] ?? null, state };
}

// ─── 4. Localisation des éléments par nom de calque ──────────────────────────

function findByName(root, name) {
  const target = name.toLowerCase();
  const stack = [root];
  while (stack.length) {
    const s = stack.pop();
    if ((s.name ?? '').toLowerCase().replace(/\s+/g, '-').includes(target)) return s;
    (s.children ?? []).forEach(c => stack.push(c));
  }
  return null;
}

function detectState(shape) {
  const n = (shape.name ?? '').toLowerCase();
  return STATES.find(s => n.includes(s)) ?? 'enabled';
}

// ─── 5. Plan de binding ───────────────────────────────────────────────────────

const report = [];
const unnamed = [];

sel.forEach(rootShape => {
  const shapeState = detectState(rootShape);

  // vérification nommage sémantique
  const badNames = [];
  (function scan(s, d = 0) {
    if (d > 5) return;
    if (/^(rectangle|ellipse|group|board|text)\s*\d*$/i.test(s.name ?? ''))
      badNames.push(s.name);
    (s.children ?? []).forEach(c => scan(c, d + 1));
  })(rootShape);
  if (badNames.length) unnamed.push({ root: rootShape.name, layers: badNames });

  // tokens d'état (Base)
  (baseSet?.tokens ?? []).forEach(tk => {
    const p = parseTokenName(tk.name);
    if (p.state && p.state !== shapeState) return; // état non concerné par ce variant
    const target = p.element === p.prop ? rootShape : (findByName(rootShape, p.element) ?? rootShape);
    const resolved = resolve(tk.value);

    report.push({
      shape: rootShape.name, token: tk.name, type: tk.type,
      element: target?.name ?? '❌ introuvable',
      prop: p.prop, value: resolved,
      status: target ? 'BIND' : 'MISS',
    });

    if (APPLY && target) {
      // détach si instance et texte concerné
      if (target.type === 'text' && rootShape.isComponentInstance?.() && !rootShape.isDetached?.()) {
        if (DETACH_APPROVED) rootShape.detach();
        else { report[report.length - 1].status = '⏸ DETACH REQUIRED'; return; }
      }
      switch (tk.type) {
        case 'color':
          if (p.prop.includes('border')) target.strokes = [{ color: resolved, width: target.strokes?.[0]?.width ?? 1 }];
          else target.fills = [{ color: resolved }];
          break;
        case 'borderRadius': target.borderRadius = parseFloat(resolved); break;
        case 'opacity': target.opacity = parseFloat(resolved); break;
      }
    }
  });

  // tokens de taille (Size set)
  (sizeSet?.tokens ?? []).forEach(tk => {
    const resolved = parseFloat(resolve(tk.value));
    const prop = tk.name.split('.').pop();
    report.push({ shape: rootShape.name, token: tk.name, type: tk.type,
      element: rootShape.name, prop, value: resolved, status: 'BIND' });

    if (APPLY && !Number.isNaN(resolved)) {
      if (prop === 'height') {
        rootShape.resize(rootShape.width, resolved);
        // ⚠️ verticalSizing auto ne propage pas — recalcul du parent
        if (rootShape.parent?.verticalSizing === 'auto') {
          const kids = rootShape.parent.children ?? [];
          const h = kids.reduce((m, k) => Math.max(m, (k.y + k.height)), 0) - rootShape.parent.y;
          rootShape.parent.resize(rootShape.parent.width, h);
        }
      }
      if (prop === 'width') rootShape.resize(resolved, rootShape.height);
    }
  });
});

// ─── 6. Rapport ───────────────────────────────────────────────────────────────

console.table(report);

if (unnamed.length) {
  console.warn('\n⚠️ Calques non sémantiques détectés — binding fragile.');
  console.warn('   Lancer penpot-rename-layers avant APPLY :');
  unnamed.forEach(u => console.warn(`   ${u.root}: ${u.layers.join(', ')}`));
}

const misses = report.filter(r => r.status !== 'BIND');
console.log(`\n${report.length} bindings — ${misses.length} problème(s)`);
console.log(APPLY ? '✅ Tokens appliqués.' : '📋 DRY RUN — valider puis APPLY = true');

if (APPLY && sel.length) penpot.selection = [sel[0]]; // localiser le résultat
