// generate-edge-cases.js — penpot-content-generator · EDGE CASES
// Génère des frames de cas limites sans toucher à l'original.
//
// ── CONFIG ─────────────────────────────────────────────────────────────────
const EDGE_CASES_TO_RUN = ['E1', 'E3', 'E4', 'E5'];

const EDGE_DEFINITIONS = {
  E1: {
    label: 'Texte très long',
    transforms: {
      'user-name':   'Jean-Baptiste Alexandre Dupont-Moreau de la Fontaine',
      'description': 'Ce texte est intentionnellement très long pour tester le comportement du layout avec un contenu débordant. Il dépasse largement les 50 caractères attendus.',
      'email-field': 'jean-baptiste.dupont-moreau@tres-longue-entreprise-internationale.com',
      'role-text':   'Directeur Général Adjoint en charge des Opérations et de la Transformation Digitale',
    },
  },
  E2: {
    label: 'Caractères non latins',
    transforms: {
      'user-name':   '山田 太郎',
      'email-field': 'تجربة@مثال.com',
      'description': '这是一段用中文写的描述文字，用于测试非拉丁字符的显示效果。',
      'role-text':   'مدير التصميم',
    },
  },
  E3: {
    label: 'Valeur nulle',
    // FIX API-4 : characters = '' échoue → utiliser ' '
    transforms: {
      'user-name':    ' ',
      'email-field':  ' ',
      'price-tag':    ' ',
      'description':  ' ',
      'status-badge': ' ',
      'role-text':    ' ',
      'date-field':   ' ',
    },
  },
  E4: {
    label: 'Montant négatif',
    transforms: {
      'price-tag':   '-1 249,00 €',
      'description': 'Solde débiteur : -1 249,00 €',
    },
  },
  E5: {
    label: 'Chars spéciaux',
    transforms: {
      'user-name':   '<script>alert("XSS")</script>',
      'description': 'Texte avec & < > " \' caractères spéciaux & entités HTML',
      'email-field': 'test+alias@sub.domain.co.uk?query=1&foo=2',
    },
  },
};

// ── UTILS ────────────────────────────────────────────────────────────────────
// FIX API-1 : board.flex = {...} ignoré → addFlexLayout() + prop par prop
function applyFlex(board, f) {
  if (!f) return;
  try { board.addFlexLayout(); } catch(e) {}
  const fl = board.flex;
  if (!fl) return;
  if (f.dir            != null) fl.dir            = f.dir;
  if (f.alignItems     != null) fl.alignItems     = f.alignItems.replace('flex-start','start').replace('flex-end','end');
  if (f.justifyContent != null) fl.justifyContent = f.justifyContent.replace('flex-start','start').replace('flex-end','end');
  if (f.paddingTop     != null) fl.paddingTop     = f.paddingTop;
  if (f.paddingBottom  != null) fl.paddingBottom  = f.paddingBottom;
  if (f.paddingLeft    != null) fl.paddingLeft    = f.paddingLeft;
  if (f.paddingRight   != null) fl.paddingRight   = f.paddingRight;
  if (f.rowGap         != null) fl.rowGap         = f.rowGap;
  if (f.columnGap      != null) fl.columnGap      = f.columnGap;
}

// ── COLLECT SHAPES ───────────────────────────────────────────────────────────
const page = penpot.currentPage;
const sel  = penpot.selection;

if (!sel.length) { console.error('❌ Aucune sélection.'); return; }
const srcFrame = sel[0];

function collectAll(shape, acc = []) {
  acc.push(shape);
  for (const child of shape.children ?? []) collectAll(child, acc);
  return acc;
}

function cloneFrame(src, newName, dx, dy) {
  const board = penpot.createBoard();
  board.name  = newName;
  board.resize(src.width, src.height);
  board.x     = src.x + dx;
  board.y     = src.y + dy;
  board.fills = src.fills?.length ? [...src.fills] : [{ fillColor: '#121212', fillOpacity: 1 }];
  if (src.flex) applyFlex(board, src.flex);
  for (const child of src.children ?? []) {
    let clone;
    if (child.type === 'text') {
      clone = penpot.createText(child.characters ?? child.name ?? '');
      clone.fills    = child.fills?.length ? [...child.fills] : [{ fillColor: '#ffffff', fillOpacity: 1 }];
      clone.fontSize = child.fontSize ?? 14;
      clone.growType = 'auto-width';
    } else {
      clone = penpot.createRectangle();
      clone.resize(child.width, child.height);
      clone.fills        = child.fills?.length ? [...child.fills] : [];
      clone.borderRadius = child.borderRadius ?? 0;
    }
    clone.name = child.name;
    board.appendChild(clone);
  }
  return board;
}

function applyTransforms(board, transforms) {
  let modified = 0;
  for (const shape of collectAll(board)) {
    if (shape.type !== 'text') continue;
    const replacement = transforms[shape.name];
    if (replacement !== undefined) {
      try { shape.characters = replacement; modified++; } catch(_) {}
    }
  }
  return modified;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
const GRID_COLS  = 2;
const CASE_GAP_X = srcFrame.width + 40;
const CASE_GAP_Y = srcFrame.height + 40;

console.log('══════ EDGE CASES GÉNÉRÉS ══════\n');

const results = [];
let idx = 0;

for (const caseId of EDGE_CASES_TO_RUN) {
  const def = EDGE_DEFINITIONS[caseId];
  if (!def) { console.warn(`⚠️ Cas "${caseId}" non défini.`); continue; }

  const col = idx % GRID_COLS;
  const row = Math.floor(idx / GRID_COLS);
  const dx  = (srcFrame.width + 40) + col * CASE_GAP_X;
  const dy  = row * CASE_GAP_Y;

  const board    = cloneFrame(srcFrame, `[EDGE:${caseId}] ${def.label}`, dx, dy);
  page.root.appendChild(board);
  const modified = applyTransforms(board, def.transforms);

  console.log(`${caseId} | ${def.label} | ${modified} textes modifiés`);
  results.push({ id: caseId, label: def.label, modified, board: board.id });
  idx++;
}

console.log(`\n✅ ${results.length} frames d'edge case créés.`);
console.log(`Original intact : ${srcFrame.name}`);
storage.edgeCaseResults = results;
return { cases: results, originalIntact: true };
