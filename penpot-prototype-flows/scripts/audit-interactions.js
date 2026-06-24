/**
 * PROTOTYPE FLOWS — Audit des interactions
 * Inventaire complet des interactions sur la page courante :
 * - Coverage par board (boards sans interactions)
 * - Types de triggers et actions utilisés
 * - Boards "orphelins" (pas de destination depuis d'autres boards)
 *
 * Usage : exécuter sur n'importe quelle page. Lecture seule.
 */

const page = penpot.currentPage;

// ─── Collecte ─────────────────────────────────────────────────────────────────

const boards    = (page.root.children ?? []).filter(s => s.type === 'frame' || s.type === 'board');
const inventory = [];

function collectInteractions(shape, boardName, depth = 0) {
  if (depth > 8) return;
  const interactions = shape.interactions ?? [];
  interactions.forEach(inter => {
    // ⚠️ Limitation API Penpot : inter.action.destination et inter.action.animation
    // ne sont pas lisibles après création — retournent undefined ou objet vide
    inventory.push({
      board:   boardName,
      shape:   shape.name ?? '?',
      trigger: inter.trigger,
      delay:   inter.delay ?? null,
      action:  inter.action?.type ?? '?',
      // dest et animation : non lisibles via l'API (limitation connue)
      dest:      'N/A (API)',
      animation: 'N/A (API)',
    });
  });
  (shape.children ?? []).forEach(c => collectInteractions(c, boardName, depth + 1));
}

boards.forEach(b => collectInteractions(b, b.name));

// ─── Rapport ─────────────────────────────────────────────────────────────────

console.log(`\n══════ AUDIT INTERACTIONS — ${page.name} ══════`);
console.log(`Boards : ${boards.length} · Interactions : ${inventory.length}`);

if (inventory.length > 0) {
  console.log('\n── INTERACTIONS ──');
  console.table(inventory);
}

// Boards sans interactions
const withInteractions = new Set(inventory.map(i => i.board));
const noInteraction = boards.filter(b => !withInteractions.has(b.name));
if (noInteraction.length) {
  console.log(`\n⚠️ Boards SANS interactions (${noInteraction.length}) :`);
  noInteraction.forEach(b => console.log(`  - ${b.name}`));
}

// Note : détection des boards "non atteignables" désactivée —
// inter.action.destination.id non lisible via l'API Penpot (limitation connue)
console.log('\nℹ️ Destinations et animations non lisibles via l\'API — champs marqués N/A');

// Distribution des triggers
const triggers = {};
inventory.forEach(i => { triggers[i.trigger] = (triggers[i.trigger] ?? 0) + 1; });
console.log('\n── TRIGGERS ──');
Object.entries(triggers).forEach(([t, n]) => console.log(`  ${t} : ${n}`));

// Distribution des actions
const actions = {};
inventory.forEach(i => { actions[i.action] = (actions[i.action] ?? 0) + 1; });
console.log('\n── ACTIONS ──');
Object.entries(actions).forEach(([a, n]) => console.log(`  ${a} : ${n}`));

// Distribution des animations
const anims = {};
inventory.forEach(i => { anims[i.animation] = (anims[i.animation] ?? 0) + 1; });
console.log('\n── ANIMATIONS ──');
Object.entries(anims).forEach(([a, n]) => console.log(`  ${a} : ${n}`));
