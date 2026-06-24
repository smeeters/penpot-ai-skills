/**
 * PROTOTYPE FLOWS — Ajout d'overlays
 * Câble des interactions open-overlay / toggle-overlay / close-overlay
 * depuis un mapping déclaratif trigger → overlay.
 *
 * Usage : définir OVERLAY_MAP, exécuter.
 *
 * API Penpot (doc.plugins.penpot.app/interfaces/OpenOverlay) :
 *   position : 'center'|'top-left'|'top-right'|'top-center'|
 *              'bottom-left'|'bottom-right'|'bottom-center'|'manual'
 */

// ─── Configuration ────────────────────────────────────────────────────────────

// Format : { triggerShapeName, overlayBoardName, options }
const OVERLAY_MAP = [
  // Exemple : bouton "Ouvrir modal" → board "Dialog/Confirmation"
  {
    trigger:   { shapeName: 'btn-ouvrir-modal', type: 'click' },
    overlay:   { boardName: 'Dialog/Confirmation' },
    action:    'open-overlay',
    position:  'center',
    closeWhenClickOutside: true,
    addBackgroundOverlay:  true,
    animation: { type: 'dissolve', duration: 200, easing: 'ease-out' },
  },
  // Exemple : burger menu → drawer
  {
    trigger:   { shapeName: 'btn-burger', type: 'click' },
    overlay:   { boardName: 'Drawer/Menu' },
    action:    'open-overlay',
    position:  'top-left',
    closeWhenClickOutside: true,
    addBackgroundOverlay:  false,
    animation: { type: 'slide', way: 'in', direction: 'left', duration: 300 },
  },
  // Exemple : icône info → tooltip (hover)
  {
    trigger:   { shapeName: 'icon-info', type: 'mouse-enter' },
    overlay:   { boardName: 'Tooltip/Info' },
    action:    'open-overlay',
    position:  'top-center',
    relativeToTrigger: true, // positionner relatif à l'élément déclencheur
    animation: { type: 'dissolve', duration: 150 },
  },
  {
    trigger:   { shapeName: 'icon-info', type: 'mouse-leave' },
    overlay:   { boardName: 'Tooltip/Info' },
    action:    'close-overlay',
  },
];

// ─── Résolution des shapes ────────────────────────────────────────────────────

const page = penpot.currentPage;

function findShapeByName(name) {
  // FIX : Penpot normalise les slashes — "Dialog/Confirmation" → "Dialog / Confirmation"
  // Normaliser les deux côtés pour la comparaison
  function normalize(s) {
    return (s ?? '').replace(/\s*\/\s*/g, ' / ').trim().toLowerCase();
  }
  const target = normalize(name);
  const stack = [...(page.root.children ?? [])];
  while (stack.length) {
    const s = stack.pop();
    if (normalize(s.name) === target) return s;
    (s.children ?? []).forEach(c => stack.push(c));
  }
  return null;
}

// ─── Câblage ─────────────────────────────────────────────────────────────────

const results = [];

OVERLAY_MAP.forEach(spec => {
  const triggerShape = findShapeByName(spec.trigger.shapeName);
  const overlayBoard = spec.overlay?.boardName
    ? findShapeByName(spec.overlay.boardName)
    : null;

  if (!triggerShape) {
    results.push({ spec: spec.trigger.shapeName, status: '❌ shape introuvable' });
    return;
  }

  if (spec.action !== 'close-overlay' && !overlayBoard) {
    results.push({ spec: spec.overlay?.boardName, status: '❌ board overlay introuvable' });
    return;
  }

  try {
    const interaction = { trigger: spec.trigger.type };

    if (spec.trigger.type === 'after-delay') {
      interaction.delay = spec.trigger.delay ?? 1000;
    }

    if (spec.action === 'close-overlay') {
      interaction.action = {
        type: 'close-overlay',
        destination: overlayBoard ?? undefined,
      };
    } else {
      interaction.action = {
        type: spec.action,
        destination: overlayBoard,
        position: spec.position ?? 'center',
        closeWhenClickOutside: spec.closeWhenClickOutside ?? false,
        addBackgroundOverlay:  spec.addBackgroundOverlay  ?? false,
        animation: spec.animation,
      };
      if (spec.relativeToTrigger) {
        interaction.action.relativeTo = triggerShape;
      }
      if (spec.manualPosition) {
        interaction.action.manualPositionLocation = spec.manualPosition;
      }
    }

    triggerShape.addInteraction(interaction);
    results.push({
      trigger: spec.trigger.shapeName,
      overlay: spec.overlay?.boardName ?? 'self',
      action:  spec.action,
      status:  '✅',
    });
  } catch(e) {
    results.push({
      trigger: spec.trigger.shapeName,
      status:  `❌ Erreur: ${e.message}`,
    });
  }
});

// ─── Rapport ─────────────────────────────────────────────────────────────────

console.table(results);
const ok    = results.filter(r => r.status.startsWith('✅')).length;
const fails = results.filter(r => r.status.startsWith('❌')).length;
console.log(`\n✅ ${ok} overlays câblés · ❌ ${fails} échecs`);
