/**
 * PROTOTYPE FLOWS — Flow linéaire
 * Connecte N boards sélectionnés en séquence :
 *   Board1 → Board2 → Board3 → ... (click → navigate-to)
 * Ajoute optionnellement un bouton Retour sur chaque board.
 *
 * Usage : sélectionner les boards dans l'ordre, exécuter.
 *
 * API Penpot (doc.plugins.penpot.app) :
 *   shape.addInteraction({ trigger, action })
 *   Trigger : 'click' | 'mouse-enter' | 'mouse-leave' | 'after-delay'
 *   Action  : NavigateTo | OpenOverlay | CloseOverlay | PreviousScreen | OpenUrl
 */

const ANIMATION_TYPE = 'slide';   // 'slide' | 'dissolve' | 'push' | null
const ANIMATION_DIRECTION = 'left'; // pour slide/push
const ANIMATION_DURATION  = 300;    // ms
const ANIMATION_EASING    = 'ease-in-out';
const ADD_BACK_BUTTON     = true;   // ajouter un bouton retour
const BACK_BUTTON_NAME    = 'btn-back'; // nom à chercher sur chaque board

// ─── Sélection ───────────────────────────────────────────────────────────────
// ⚠️ Ce script requiert une sélection manuelle dans Penpot UI.
// Sélectionner les boards DANS L'ORDRE du flow avant d'exécuter.
// Raccourci : cliquer sur le premier board, puis Shift+clic sur les suivants.
// L'ordre de sélection = l'ordre du flow (Splash → Home → Detail).
//
// Alternative programmatique : remplacer par page.root.children.filter(...)
// avec un ordre basé sur les coordonnées X ou un tableau de noms explicite :
//   const BOARD_ORDER = ['Splash', 'Home', 'Detail'];
//   const boards = BOARD_ORDER.map(n =>
//     page.root.children.find(s => s.name === n)).filter(Boolean);

const boards = penpot.selection.filter(s =>
  s.type === 'frame' || s.type === 'board'
);

if (boards.length < 2)
  throw new Error(`❌ Sélectionner au moins 2 boards dans l'ordre du flow (${penpot.selection.length} sélectionnés).`);

console.log(`Flow linéaire : ${boards.map(b => b.name).join(' → ')}`);

// ─── Helper animation ─────────────────────────────────────────────────────────

function makeAnimation(type, direction, way = 'in') {
  if (!type) return undefined;
  switch (type) {
    case 'dissolve':
      return { type: 'dissolve', duration: ANIMATION_DURATION, easing: ANIMATION_EASING };
    case 'slide':
      return { type: 'slide', way, direction, duration: ANIMATION_DURATION,
               offsetEffect: false, easing: ANIMATION_EASING };
    case 'push':
      return { type: 'push', direction, duration: ANIMATION_DURATION, easing: ANIMATION_EASING };
    default:
      return undefined;
  }
}

// Direction retour = opposée de la direction aller
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

// ─── Création du flow ─────────────────────────────────────────────────────────

let created = 0;

boards.forEach((board, i) => {
  const next = boards[i + 1];
  const prev = boards[i - 1];

  // ── Interaction suivant (click → navigate-to) ──
  if (next) {
    board.addInteraction({
      trigger: 'click',
      action: {
        type: 'navigate-to',
        destination: next,
        preserveScrollPosition: false,
        animation: makeAnimation(ANIMATION_TYPE, ANIMATION_DIRECTION, 'in'),
      },
    });
    created++;
    console.log(`  ✅ ${board.name} → ${next.name}`);
  }

  // ── Bouton retour (si présent et pas le premier board) ──
  if (ADD_BACK_BUTTON && prev) {
    // Chercher le bouton retour par nom de calque
    function findBack(shape) {
      if ((shape.name ?? '').toLowerCase().includes(BACK_BUTTON_NAME.toLowerCase())) return shape;
      for (const c of (shape.children ?? [])) { const r = findBack(c); if (r) return r; }
      return null;
    }
    const backBtn = findBack(board);
    if (backBtn) {
      backBtn.addInteraction({
        trigger: 'click',
        action: {
          type: 'navigate-to',
          destination: prev,
          animation: makeAnimation(ANIMATION_TYPE, OPPOSITE[ANIMATION_DIRECTION] ?? ANIMATION_DIRECTION, 'out'),
        },
      });
      created++;
      console.log(`    ↩️  ${backBtn.name} → ${prev.name}`);
    } else {
      console.warn(`  ⚠️  Pas de calque "${BACK_BUTTON_NAME}" sur ${board.name} — retour non câblé`);
    }
  }
});

// ─── Rapport ─────────────────────────────────────────────────────────────────

console.log(`\n✅ Flow créé : ${boards.length} boards · ${created} interactions`);
console.log(`Animation : ${ANIMATION_TYPE ?? 'aucune'} (${ANIMATION_DIRECTION}, ${ANIMATION_DURATION}ms)`);
console.log(`\n📋 Tester en mode prototype : Ctrl+P dans Penpot`);
