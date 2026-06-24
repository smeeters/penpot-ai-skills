/**
 * PENPOT-ANNOTATION — ANNOTATE
 * Génère une couche d'annotation de handoff sur le frame/sélection courant.
 * Toutes les annotations vont dans un board [Annotations] — design intact.
 *
 * Usage : coller dans penpot:execute_code après sélection du/des frame(s).
 *
 * Gotchas intégrés :
 *  - penpot.createBoard() et non createFrame() (bug #6)
 *  - page.root.appendChild() et non page.appendChild() (bug session 1)
 *  - écriture directe sur .fills (pas applyToken — bugs #9162/#9641)
 *  - scanner depuis le fichier source de la librairie (bug #7)
 */

const MODE   = 'ANNOTATE'; // 'ANNOTATE' | 'CLEAN'
const SCOPE  = 'selection'; // 'selection' | 'page' (annote tous les frames)
const SHOW_HARDCODED = true;  // inclure les flags ⚠️ valeurs hardcodées
const SHOW_SPACING   = true;  // annoter les espacements
const SHOW_COMPONENTS = true; // annoter les composants et variants

// ─── Couleurs des labels ──────────────────────────────────────────────────────
const COLORS = {
  tokenColor:    '#1a4731', // vert foncé — propriété tokenisée
  hardcoded:     '#7f1d1d', // rouge foncé — valeur hardcodée
  spacing:       '#1e3a5f', // bleu foncé — espacement tokenisé
  spacingHard:   '#7c2d12', // orange foncé — espacement hardcodé
  component:     '#3b0764', // violet — composant
  typography:    '#1c1917', // gris foncé — typographie
  labelText:     '#ffffff', // texte des labels
};

// ─── CLEAN ────────────────────────────────────────────────────────────────────
if (MODE === 'CLEAN') {
  const annot = (penpot.currentPage.root.children ?? [])
    .find(s => s.name === '[Annotations]');
  if (annot) {
    penpot.currentPage.root.removeChild(annot);
    console.log('✅ Board [Annotations] supprimé.');
  } else {
    console.log('ℹ️ Aucun board [Annotations] trouvé sur cette page.');
  }
}

// ─── ANNOTATE ─────────────────────────────────────────────────────────────────
if (MODE === 'ANNOTATE') {

  // 1. Scope
  const page   = penpot.currentPage;
  const tokLib = penpot.library.local.tokens ?? penpot.tokens;

  let sources = [];
  if (SCOPE === 'selection' && penpot.selection.length > 0) {
    sources = penpot.selection;
  } else {
    sources = (page.root.children ?? []).filter(s =>
      s.type === 'frame' || s.type === 'board');
  }
  if (sources.length === 0)
    throw new Error('❌ Aucun frame à annoter. Sélectionner ou naviguer vers une page avec des frames.');

  // 2. Index tokens valeur → nom
  const tokenByValue = new Map();
  const allTokens    = new Map();
  (tokLib?.sets ?? []).forEach(set =>
    (set.tokens ?? []).forEach(t => {
      allTokens.set(t.name, t);
      if (!/^\{.+\}$/.test(String(t.value)))
        tokenByValue.set(`${t.type}::${String(t.value).toLowerCase()}`, t.name);
    })
  );

  function resolveAlias(v, d = 0) {
    if (d > 8) return v;
    const m = /^\{(.+)\}$/.exec(String(v).trim());
    if (!m) return v;
    const ref = allTokens.get(m[1]);
    return ref ? resolveAlias(ref.value, d + 1) : v;
  }
  // Indexer aussi les valeurs résolues des aliases
  allTokens.forEach((t, name) => {
    const resolved = resolveAlias(t.value);
    const key = `${t.type}::${String(resolved).toLowerCase()}`;
    if (!tokenByValue.has(key)) tokenByValue.set(key, name);
  });

  const hasTokens = tokenByValue.size > 0;

  // 3. Helpers de création de labels
  // LOT 2 — Police sécurisée : fallback si Roboto Mono absent
  const MONO = 'Roboto Mono';
  const MONO_FB = 'Courier New';
  function setFontSafe(shape, font, fallback) {
    try {
      shape.fontFamily = font;
      if (shape.fontFamily !== font) { shape.fontFamily = fallback; }
    } catch(e) { try { shape.fontFamily = fallback; } catch(e2) {} }
  }

  function makeLabel(text, color, x, y) {
    const bg = penpot.createBoard();
    bg.name  = `_annot_${text.slice(0, 30).replace(/\s/g, '_')}`;
    bg.resize(Math.max(120, text.length * 6.5 + 16), 20);
    bg.x = x; bg.y = y;
    bg.borderRadius = 3;
    bg.fills = [{ color }];

    const label = penpot.createText(text || ' '); // API-4 : jamais ''
    label.name  = '_annot_label';
    label.x     = x + 6; label.y = y + 4;
    label.fontSize = 10;
    setFontSafe(label, MONO, MONO_FB);
    label.fills = [{ color: COLORS.labelText }];

    return { bg, label };
  }

  // 4. Suppression du board [Annotations] existant
  const existing = (page.root.children ?? []).find(s => s.name === '[Annotations]');
  if (existing) page.root.removeChild(existing);

  // 5. Création du board principal d'annotations
  const sourceFrame = sources[0];
  const annotBoard  = penpot.createBoard();
  annotBoard.name   = '[Annotations]';
  annotBoard.x      = sourceFrame.x + sourceFrame.width + 40;
  annotBoard.y      = sourceFrame.y;
  annotBoard.resize(400, 800);
  annotBoard.fills  = [{ fillColor: '#f8f9fa', fillOpacity: 1 }];
  page.root.appendChild(annotBoard);

  // 6. Collecte et création des annotations
  let offsetY    = 16;
  let totalAnnot = 0;
  let hardcoded  = 0;
  let tokenized  = 0;

  const INDENT = 16;

  function addAnnotation(text, color) {
    const { bg, label } = makeLabel(text, color, INDENT, annotBoard.y + offsetY);
    annotBoard.appendChild(bg);
    annotBoard.appendChild(label);
    offsetY += 26;
    totalAnnot++;
  }

  function addSection(title) {
    const t = penpot.createText(`── ${title} ──`);
    t.name     = '_annot_section';
    t.x        = INDENT; t.y = annotBoard.y + offsetY;
    t.fontSize = 9;
    setFontSafe(t, MONO, MONO_FB);
    t.fills = [{ fillColor: '#6b7280', fillOpacity: 1 }];
    annotBoard.appendChild(t);
    offsetY += 20;
  }

  function analyzeShape(shape, depth = 0) {
    if (depth > 6) return;
    const name = shape.name ?? '?';

    // ── Couleurs ──
    if ((shape.fills ?? []).length > 0) {
      (shape.fills ?? []).forEach(f => {
        if (!f.color || f.color === 'transparent') return;
        if (f.opacity != null && f.opacity < 0.05) return;
        const op  = f.opacity != null && f.opacity < 0.999
          ? Math.round(f.opacity * 1000) / 1000 : null;
        const val = op ? `${f.color.toLowerCase()}@${op}` : f.color.toLowerCase();
        const key = `color::${val}`;
        const tok = tokenByValue.get(key);
        if (tok) {
          addAnnotation(`● ${name} fill → ${tok}`, COLORS.tokenColor);
          tokenized++;
        } else if (SHOW_HARDCODED && hasTokens) {
          addAnnotation(`● ${name} fill ⚠️ ${f.color}`, COLORS.hardcoded);
          hardcoded++;
        }
      });
    }

    // ── Radius ──
    if ((shape.borderRadius ?? 0) > 0) {
      const key = `borderRadius::${shape.borderRadius}`;
      const tok = tokenByValue.get(key);
      if (tok) {
        addAnnotation(`◉ ${name} radius → ${tok}`, COLORS.tokenColor);
        tokenized++;
      } else if (SHOW_HARDCODED && hasTokens) {
        addAnnotation(`◉ ${name} radius ⚠️ ${shape.borderRadius}px`, COLORS.hardcoded);
        hardcoded++;
      }
    }

    // ── Espacements ──
    if (SHOW_SPACING && shape.flex) {
      const rev = /reverse/.test(shape.flex.dir ?? '');
      const pv  = rev ? shape.flex.paddingBottom : shape.flex.paddingTop;
      const ph  = rev ? shape.flex.paddingRight  : shape.flex.paddingLeft;
      const gap = shape.flex.rowGap ?? 0;

      [[pv, 'padding-v', 'spacing'], [ph, 'padding-h', 'spacing'], [gap, 'gap', 'spacing']]
        .filter(([v]) => v > 0)
        .forEach(([v, prop]) => {
          const key = `spacing::${v}`;
          const tok = tokenByValue.get(key);
          if (tok) {
            addAnnotation(`↕ ${name} ${prop} ${v}px → ${tok}`, COLORS.spacing);
            tokenized++;
          } else if (SHOW_HARDCODED && hasTokens) {
            addAnnotation(`↕ ${name} ${prop} ⚠️ ${v}px`, COLORS.spacingHard);
            hardcoded++;
          }
        });
    }

    // ── Typographie ──
    if (shape.type === 'text' && shape.fontSize) {
      const info = `${shape.fontSize}px/${shape.lineHeight ?? '?'} ${shape.fontWeight ?? 400}`;
      addAnnotation(`T ${name} · ${info}`, COLORS.typography);
    }

    // ── Composant ──
    // ⚠️ componentId et mainComponentId non exposés par l'API Plugin
    // → Heuristique : nom contenant '/' (convention MUI/Carbon/Atlassian)
    //   + isComponentInstance() si disponible
    if (SHOW_COMPONENTS) {
      const isComp = shape.isComponentInstance?.()
        || /\//.test(shape.name ?? ''); // ex: "Button/Outlined", "Icon/Close"
      if (isComp) {
        const detached = shape.isDetached?.() ? ' ↳ détaché ⚠️' : '';
        addAnnotation(`◈ ${name}${detached}`, COLORS.component);
      }
    }

    (shape.children ?? []).forEach(c => analyzeShape(c, depth + 1));
  }

  // 7. Analyser chaque source
  sources.forEach(src => {
    addSection(src.name);
    analyzeShape(src);
  });

  // 8. Résumé en bas du board
  offsetY += 8;
  addSection('RÉSUMÉ');
  addAnnotation(`✅ ${tokenized} propriétés tokenisées`, COLORS.tokenColor);
  if (hardcoded > 0)
    addAnnotation(`⚠️ ${hardcoded} valeurs hardcodées`, COLORS.hardcoded);
  if (!hasTokens)
    addAnnotation('ℹ️ Aucun token — lancer penpot-foundations BOOTSTRAP', COLORS.spacingHard);

  // Ajuster la hauteur du board
  annotBoard.resize(400, offsetY + 24);

  penpot.selection = [annotBoard];

  // ─── Pattern targetId (API-7) — persistance inter-blocs ──────────────────
  // penpot.selection est perdu entre execute_code — stocker l'ID via pluginData
  try {
    penpot.currentPage.setPluginData('annotation:lastBoardId', annotBoard.id);
  } catch(e) { /* pluginData non disponible — ignorer */ }

  console.log(`\n══════ ANNOTATION GÉNÉRÉE ══════`);
  console.log(`Board [Annotations] créé @ x:${annotBoard.x}, y:${annotBoard.y}`);
  console.log(`Annotations : ${totalAnnot}`);
  console.log(`  ✅ Tokenisées : ${tokenized}`);
  console.log(`  ⚠️  Hardcodées : ${hardcoded}`);
  console.log(`\nPour supprimer : passer MODE = 'CLEAN'`);
}
