// generate-variants.js — penpot-responsive-variants
// Génère [Mobile] 375px et [Tablet] 768px depuis un frame desktop sélectionné.
// Ne modifie pas le frame source.
//
// ── CONFIG ─────────────────────────────────────────────────────────────────
const GENERATE_MOBILE = true;
const GENERATE_TABLET = true;

const NAV_PATTERNS = {
  sidebar:  /sidebar|drawer|side-nav|sidenav|left-nav|left-panel|nav-panel/i,
  topnav:   /topnav|top-nav|header|navbar|app-bar|appbar/i,
  tabs:     /tabs|tab-bar/i,
  table:    /table|data-grid|datagrid/i,
};

const BP    = { mobile: 375, tablet: 768 };
const SCALE = { mobile: 0.5, tablet: 0.75 };

// ── UTILS ───────────────────────────────────────────────────────────────────
function round4(n) { return Math.round(n / 4) * 4; }

// FIX API-1 : b.flex = {...} ignoré → addFlexLayout() + prop par prop
// FIX API-2 : alignItems 'flex-start' invalide → 'start'
function normalizeAlign(v) {
  if (!v) return v;
  return v.replace('flex-start', 'start').replace('flex-end', 'end');
}

function applyFlex(board, f) {
  if (!f) return;
  try { board.addFlexLayout(); } catch(e) {}
  const fl = board.flex;
  if (!fl) return;
  if (f.dir            != null) fl.dir            = f.dir;
  if (f.alignItems     != null) fl.alignItems     = normalizeAlign(f.alignItems);
  if (f.justifyContent != null) fl.justifyContent = normalizeAlign(f.justifyContent);
  if (f.paddingTop     != null) fl.paddingTop     = f.paddingTop;
  if (f.paddingBottom  != null) fl.paddingBottom  = f.paddingBottom;
  if (f.paddingLeft    != null) fl.paddingLeft    = f.paddingLeft;
  if (f.paddingRight   != null) fl.paddingRight   = f.paddingRight;
  if (f.rowGap         != null) fl.rowGap         = f.rowGap;
  if (f.columnGap      != null) fl.columnGap      = f.columnGap;
}

function cloneShape(src) {
  const type = src.type;
  if (type === 'frame' || type === 'board') {
    const b = penpot.createBoard();
    b.name = src.name;
    b.resize(src.width, src.height);
    b.fills = src.fills?.length ? [...src.fills] : [];
    b.borderRadius = src.borderRadius ?? 0;
    applyFlex(b, src.flex);
    return b;
  }
  if (type === 'rect' || type === 'rectangle') {
    const r = penpot.createRectangle();
    r.name = src.name;
    r.resize(src.width, src.height);
    r.fills = src.fills?.length ? [...src.fills] : [];
    r.borderRadius = src.borderRadius ?? 0;
    return r;
  }
  if (type === 'text') {
    const t = penpot.createText(src.characters ?? src.name);
    t.name = src.name;
    t.fontSize = src.fontSize ?? 14;
    t.fills = src.fills?.length ? [...src.fills] : [{ fillColor: '#ffffff', fillOpacity: 1 }];
    return t;
  }
  const ph = penpot.createRectangle();
  ph.name = src.name + ' (placeholder)';
  ph.resize(src.width, src.height);
  ph.fills = [{ fillColor: '#2e2e2e', fillOpacity: 0.5 }];
  return ph;
}

function deepCloneChildren(srcChildren, targetBoard, scaleW, variantKey) {
  for (const child of srcChildren ?? []) {
    const clone = cloneShape(child);
    targetBoard.appendChild(clone);
    const newW = round4(child.width * scaleW);
    clone.resize(newW, child.height);
    if (child.flex) {
      const pScale = variantKey === 'mobile' ? SCALE.mobile : SCALE.tablet;
      applyFlex(clone, {
        dir:           child.flex.dir,
        alignItems:    child.flex.alignItems,
        justifyContent: child.flex.justifyContent,
        paddingTop:    round4((child.flex.paddingTop    ?? 0) * pScale),
        paddingBottom: round4((child.flex.paddingBottom ?? 0) * pScale),
        paddingLeft:   round4((child.flex.paddingLeft   ?? 0) * pScale),
        paddingRight:  round4((child.flex.paddingRight  ?? 0) * pScale),
        rowGap:        round4(child.flex.rowGap    ?? 0),
        columnGap:     round4(child.flex.columnGap ?? 0),
      });
    }
    if (child.children?.length) {
      deepCloneChildren(child.children, clone, scaleW, variantKey);
    }
  }
}

// ── MAIN ────────────────────────────────────────────────────────────────────
const page = penpot.currentPage;
const sel  = penpot.selection;

if (!sel.length) { console.error('❌ Aucune sélection.'); return; }
const src = sel[0];
if (src.width < 600) { console.error(`❌ Frame trop petit (${src.width}px).`); return; }

const children  = src.children ?? [];
const detections = {
  sidebar: children.filter(c => NAV_PATTERNS.sidebar.test(c.name)),
  topnav:  children.filter(c => NAV_PATTERNS.topnav.test(c.name)),
};
const flexRowCount = children.filter(c => c.flex?.dir === 'row').length;

console.log('══════ ANALYSE FRAME SOURCE ══════');
console.log(`Nom : "${src.name}" · ${src.width}×${src.height}px`);
console.log(`Sidebar : ${detections.sidebar.length > 0} | Flex-rows : ${flexRowCount}`);

const createdBoards = [];
let offsetX = src.x + src.width + 40;

const VARIANTS = [];
if (GENERATE_MOBILE) VARIANTS.push({ key: 'mobile', label: 'Mobile', width: BP.mobile, scale: SCALE.mobile });
if (GENERATE_TABLET) VARIANTS.push({ key: 'tablet', label: 'Tablet', width: BP.tablet, scale: SCALE.tablet });

for (const variant of VARIANTS) {
  const scaleW  = variant.width / src.width;
  const vBoard  = penpot.createBoard();
  vBoard.name   = `[${variant.label}] ${src.name}`;
  vBoard.resize(variant.width, src.height);
  vBoard.x      = offsetX;
  vBoard.y      = src.y;
  vBoard.fills  = src.fills?.length ? [...src.fills] : [{ fillColor: '#121212', fillOpacity: 1 }];

  if (src.flex) {
    const newDir = (variant.key === 'mobile' && src.flex.dir === 'row') ? 'column' : src.flex.dir;
    applyFlex(vBoard, {
      dir:           newDir,
      alignItems:    src.flex.alignItems,
      justifyContent: src.flex.justifyContent,
      paddingTop:    round4((src.flex.paddingTop    ?? 0) * variant.scale),
      paddingBottom: round4((src.flex.paddingBottom ?? 0) * variant.scale),
      paddingLeft:   round4((src.flex.paddingLeft   ?? 0) * variant.scale),
      paddingRight:  round4((src.flex.paddingRight  ?? 0) * variant.scale),
      rowGap:    src.flex.rowGap,
      columnGap: src.flex.columnGap,
    });
  }

  page.root.appendChild(vBoard);

  for (const child of children) {
    const isSidebar = NAV_PATTERNS.sidebar.test(child.name);
    if (isSidebar && variant.key === 'mobile') {
      const bottomNav = penpot.createBoard();
      bottomNav.name  = '[Bottom Nav]';
      bottomNav.resize(variant.width, 56);
      bottomNav.fills = [{ fillColor: '#1e1e1e', fillOpacity: 1 }];
      applyFlex(bottomNav, { dir: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 12 });
      const navLabel = penpot.createText('⬛ ⬛ ⬛ ⬛  [Bottom Nav placeholder]');
      navLabel.name     = 'bottom-nav-label';
      navLabel.fontSize = 10;
      navLabel.fills    = [{ fillColor: '#9e9e9e', fillOpacity: 1 }];
      bottomNav.appendChild(navLabel);
      vBoard.appendChild(bottomNav);
      continue;
    }
    const cloneW = round4(child.width * scaleW);
    const clone  = cloneShape(child);
    clone.resize(cloneW, child.height);
    if (child.flex) {
      const newDir = (variant.key === 'mobile' && child.flex.dir === 'row') ? 'column' : child.flex.dir;
      applyFlex(clone, {
        dir: newDir, alignItems: child.flex.alignItems, justifyContent: child.flex.justifyContent,
        paddingTop:    round4((child.flex.paddingTop    ?? 0) * variant.scale),
        paddingBottom: round4((child.flex.paddingBottom ?? 0) * variant.scale),
        paddingLeft:   round4((child.flex.paddingLeft   ?? 0) * variant.scale),
        paddingRight:  round4((child.flex.paddingRight  ?? 0) * variant.scale),
        rowGap: child.flex.rowGap, columnGap: child.flex.columnGap,
      });
    }
    if (child.children?.length) deepCloneChildren(child.children, clone, scaleW, variant.key);
    vBoard.appendChild(clone);
  }

  // Recalcul hauteur
  const kids = vBoard.children ?? [];
  let totalH = 0;
  for (const c of kids) { const b = (c.y - vBoard.y) + c.height; if (b > totalH) totalH = b; }
  if (totalH > 0) vBoard.resize(variant.width, Math.max(totalH + 24, src.height * 0.5));

  createdBoards.push({ name: vBoard.name, width: variant.width, height: vBoard.height });
  console.log(`✅ [${variant.label}] créé : ${variant.width}×${vBoard.height}px @ ${Math.round(offsetX)},${Math.round(src.y)}`);
  offsetX += variant.width + 40;
}

if (detections.sidebar.length > 0 && GENERATE_MOBILE)
  console.log('⚠️ Sidebar → [Bottom Nav] sur mobile.');
if (flexRowCount > 0 && GENERATE_MOBILE)
  console.log(`ℹ️ ${flexRowCount} flex-row(s) → column sur mobile.`);

storage.responsiveVariants = createdBoards;
return { variants: createdBoards };
