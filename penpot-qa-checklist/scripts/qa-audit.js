/**
 * QA CHECKLIST — AUDIT COMPLET
 * 6 familles de contrôles, scoring pondéré, rapport priorisé.
 * LECTURE SEULE — ne modifie jamais le fichier.
 *
 * Usage : coller dans penpot:execute_code.
 * Scope : sélection > page courante.
 */

const GRID = 4;                 // grille de base (px)
const PROFILE = 'standard';     // standard | strict (strict: warnings → errors)

// ─── Scope ────────────────────────────────────────────────────────────────────

const roots = penpot.selection.length > 0
  ? penpot.selection
  : (penpot.currentPage.root.children ?? []);
if (roots.length === 0) throw new Error('❌ Rien à auditer.');

// ─── Index des tokens (pour QA-1) ────────────────────────────────────────────

const tokensLib = penpot.library.local.tokens ?? penpot.tokens;
const tokenByValue = new Map(); // "type::valeur" → nom du token
let tokenCount = 0;

(tokensLib?.sets ?? []).forEach(set => {
  (set.tokens ?? []).forEach(tk => {
    tokenCount++;
    if (!/^\{.+\}$/.test(String(tk.value))) { // littéraux seulement (la Fondation)
      tokenByValue.set(`${tk.type}::${String(tk.value).toLowerCase()}`, tk.name);
    }
  });
});

// Résolution des alias pour indexer aussi les valeurs finales des semantics
const allTokens = new Map();
(tokensLib?.sets ?? []).forEach(s => (s.tokens ?? []).forEach(t => allTokens.set(t.name, t)));
function resolveValue(v, d = 0) {
  if (d > 8) return v;
  const m = /^\{(.+)\}$/.exec(String(v).trim());
  if (!m) return v;
  const ref = allTokens.get(m[1]);
  return ref ? resolveValue(ref.value, d + 1) : v;
}
allTokens.forEach((t, name) => {
  const final = resolveValue(t.value);
  const key = `${t.type}::${String(final).toLowerCase()}`;
  if (!tokenByValue.has(key)) tokenByValue.set(key, name);
});

const noTokens = tokenCount === 0;

// ─── Collecte des findings ───────────────────────────────────────────────────

const findings = []; // {family, severity, element, found, expected, fix}
const SEV = { error: 'error', warning: 'warning', info: 'info' };
function add(family, severity, element, found, expected, fix) {
  if (PROFILE === 'strict' && severity === SEV.warning) severity = SEV.error;
  findings.push({ family, severity, element, found, expected, fix });
}

const GENERIC_NAME = /^(rectangle|ellipse|group|board|text|path|frame|image)\s*\d*$/i;
const DEMO_TEXT = /lorem ipsum|^(text|label|title|button)$/i;
const INTERACTIVE = /button|btn|input|field|select|toggle|switch|checkbox|radio|tab|link|chip/i;

function elPath(shape, root) {
  return `${root.name} › ${shape.name ?? '?'}`;
}

function walk(shape, root, depth = 0, ancestors = []) {
  if (depth > 12) return;
  const path = elPath(shape, root);

  // ── QA-1 Tokenisation ──
  (shape.fills ?? []).forEach(f => {
    if (!f.color || f.color === 'transparent') return;
    const key = `color::${f.color.toLowerCase()}`;
    if (tokenByValue.has(key))
      add('QA-1', SEV.error, path, `fill ${f.color} hardcodé`,
        `{${tokenByValue.get(key)}}`, 'penpot-token-pipeline B (APPLY)');
    else if (!noTokens)
      add('QA-1', SEV.warning, path, `fill ${f.color} sans token`,
        'créer la chaîne Fondation→Semantic', 'penpot-token-pipeline A (EXTRACT)');
  });
  (shape.strokes ?? []).forEach(s => {
    if (!s.color) return;
    const key = `color::${s.color.toLowerCase()}`;
    if (tokenByValue.has(key))
      add('QA-1', SEV.error, path, `stroke ${s.color} hardcodé`,
        `{${tokenByValue.get(key)}}`, 'penpot-token-pipeline B');
  });
  if (shape.borderRadius > 0) {
    const key = `borderRadius::${shape.borderRadius}`;
    if (tokenByValue.has(key))
      add('QA-1', SEV.error, path, `radius ${shape.borderRadius} hardcodé`,
        `{${tokenByValue.get(key)}}`, 'penpot-token-pipeline B');
  }

  // ── QA-2 Grille & géométrie ──
  if (shape.flex) {
    const f = shape.flex;
    const gaps = [f.rowGap, f.columnGap].filter(v => v > 0);
    gaps.forEach(g => {
      if (g % GRID !== 0)
        add('QA-2', SEV.error, path, `gap ${g}px hors grille`,
          `${Math.round(g / GRID) * GRID}px`, 'manuel');
    });
    [f.paddingTop, f.paddingBottom, f.paddingLeft, f.paddingRight]
      .filter(v => v > 0).forEach(p => {
        if (p % GRID !== 0)
          add('QA-2', SEV.error, path, `padding ${p}px hors grille`,
            `${Math.round(p / GRID) * GRID}px`, 'manuel');
      });
  }
  if (shape.x != null && shape.x % 1 !== 0)
    add('QA-2', SEV.warning, path, `x=${shape.x} (demi-pixel)`, 'coordonnée entière', 'manuel');
  if (shape.y != null && shape.y % 1 !== 0)
    add('QA-2', SEV.warning, path, `y=${shape.y} (demi-pixel)`, 'coordonnée entière', 'manuel');

  // Espacements incohérents dans une pile flex
  if (shape.flex && (shape.children ?? []).length >= 3) {
    const kids = [...shape.children].sort((a, b) =>
      shape.flex.dir?.startsWith('row') ? a.x - b.x : a.y - b.y);
    const spacings = [];
    for (let i = 1; i < kids.length; i++) {
      const s = shape.flex.dir?.startsWith('row')
        ? kids[i].x - (kids[i - 1].x + kids[i - 1].width)
        : kids[i].y - (kids[i - 1].y + kids[i - 1].height);
      if (s > 0) spacings.push(Math.round(s));
    }
    const uniq = [...new Set(spacings)];
    if (uniq.length > 1 && Math.max(...uniq) - Math.min(...uniq) <= 6)
      add('QA-2', SEV.error, path, `espacements incohérents (${spacings.join(', ')})`,
        'valeur unique sur la grille', 'manuel');
  }

  // ── QA-3 Hygiène ──
  if (GENERIC_NAME.test(shape.name ?? ''))
    add('QA-3', SEV.error, path, `nom générique "${shape.name}"`,
      'nom sémantique (container, label, icon…)', 'penpot-rename-layers');
  if (shape.type === 'group' && (shape.children ?? []).length === 0)
    add('QA-3', SEV.warning, path, 'groupe vide', 'supprimer', 'manuel');
  if (shape.hidden || shape.opacity === 0)
    add('QA-3', SEV.warning, path, 'calque invisible', 'supprimer ou documenter', 'manuel');
  if (depth > 6)
    add('QA-3', SEV.info, path, `imbrication niveau ${depth}`, '≤ 6 niveaux', 'restructurer');

  // ── QA-4 Intégrité des composants ──
  try {
    if (shape.isComponentInstance?.() && shape.isDetached?.())
      add('QA-4', SEV.error, path, 'instance détachée',
        're-instancier depuis la bibliothèque', 'penpot-library-mapper');
  } catch (e) { /* API variable selon version */ }

  // ── QA-5 États & complétude ──
  if (shape.type === 'text' && DEMO_TEXT.test((shape.characters ?? '').trim()))
    add('QA-5', SEV.warning, path, `texte de démo "${(shape.characters ?? '').slice(0, 30)}"`,
      'contenu réaliste', 'penpot-content-generator');

  (shape.children ?? []).forEach(c => walk(c, root, depth + 1, [...ancestors, shape]));
}

roots.forEach(r => walk(r, r));

// ── QA-5 (niveau racine) : composants interactifs sans variants d'état ──
roots.forEach(r => {
  if (INTERACTIVE.test(r.name ?? '')) {
    const hasStates = /enabled|hovered|focused|pressed|disabled/i.test(r.name ?? '') ||
      (r.children ?? []).some(c => /hovered|focused|disabled/i.test(c.name ?? ''));
    if (!hasStates)
      add('QA-5', SEV.warning, r.name, 'composant interactif sans variants d\'état visibles',
        'variants enabled/hovered/focused/pressed/disabled', 'penpot-component-factory');
  }
});

// ── QA-6 Pré-accessibilité (échantillonnage rapide) ──
roots.forEach(r => {
  (function quick(s, d = 0) {
    if (d > 6) return;
    if (INTERACTIVE.test(s.name ?? '') && (s.width < 24 || s.height < 24))
      add('QA-6', SEV.error, elPath(s, r),
        `cible ${Math.round(s.width)}×${Math.round(s.height)}px`,
        '≥ 24×24px (WCAG 2.5.8)', 'penpot-wcag22');
    (s.children ?? []).forEach(c => quick(c, d + 1));
  })(r);
});

if (noTokens)
  add('QA-1', SEV.warning, '(global)', 'aucun token dans la librairie',
    'bootstrapper la structure 3 niveaux', 'penpot-token-pipeline C (BOOTSTRAP)');

// ─── Scoring ──────────────────────────────────────────────────────────────────

const WEIGHTS = { 'QA-1': 0.30, 'QA-2': 0.20, 'QA-3': 0.15, 'QA-4': 0.20, 'QA-5': 0.10, 'QA-6': 0.05 };
const PENALTY = { error: 10, warning: 3, info: 0 };
// En mode strict : pas de plafond par famille + coefficient 1.5 sur les pénalités
// En mode standard : plafond à 100 par famille (une famille catastrophique n'absorbe pas tout)
const FAMILY_CAP    = PROFILE === 'strict' ? Infinity : 100;
const STRICT_COEFF  = PROFILE === 'strict' ? 1.5 : 1.0;

let totalPenalty = 0;
Object.keys(WEIGHTS).forEach(fam => {
  const raw = findings
    .filter(f => f.family === fam)
    .reduce((a, f) => a + PENALTY[f.severity], 0);
  const famPenalty = Math.min(FAMILY_CAP, raw * STRICT_COEFF);
  totalPenalty += famPenalty * WEIGHTS[fam];
});
const score = Math.max(0, Math.round(100 - totalPenalty));
const verdict = score >= 90 ? '✅ PRÊT' : score >= 70 ? '🟡 CORRECTIONS MINEURES' : '🔴 NON PRÊT';

// ─── Rapport ──────────────────────────────────────────────────────────────────

const errors   = findings.filter(f => f.severity === 'error');
const warnings = findings.filter(f => f.severity === 'warning');
const infos    = findings.filter(f => f.severity === 'info');

console.log(`\n══════ QA — Score ${score}/100 ${verdict} ══════`);
console.log(`Scope : ${roots.map(r => r.name).join(', ')} | Profil : ${PROFILE} | Tokens lib : ${tokenCount}`);

if (errors.length)   { console.log(`\n❌ ERRORS (${errors.length})`);   console.table(errors); }
if (warnings.length) { console.log(`\n⚠️ WARNINGS (${warnings.length})`); console.table(warnings); }
if (infos.length)    { console.log(`\n💡 INFO (${infos.length})`);      console.table(infos); }

// Plan priorisé : rename d'abord, tokens ensuite, instances, puis le reste
const plan = [];
if (findings.some(f => f.fix === 'penpot-rename-layers'))
  plan.push('1. penpot-rename-layers (fiabilise les contrôles par nom)');
if (findings.some(f => f.fix?.startsWith('penpot-token-pipeline')))
  plan.push(`${plan.length + 1}. penpot-token-pipeline (tokeniser les valeurs hardcodées)`);
if (findings.some(f => f.fix === 'penpot-library-mapper'))
  plan.push(`${plan.length + 1}. penpot-library-mapper (re-instancier les détachés)`);
if (findings.some(f => f.fix === 'penpot-wcag22'))
  plan.push(`${plan.length + 1}. penpot-wcag22 (audit accessibilité complet)`);
plan.push(`${plan.length + 1}. Re-run QA → objectif ≥ 90`);

console.log('\n📋 PLAN DE CORRECTION PRIORISÉ');
plan.forEach(p => console.log('  ' + p));
