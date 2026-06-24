/**
 * TOKEN PIPELINE — BOOTSTRAP v2
 * Librairie SANS tokens → structure 3 niveaux (Fondation / Semantic / Component)
 *
 * 3 ÉTAPES SÉQUENTIELLES — exécuter l'une après l'autre, pas tout d'un coup.
 *
 *   ÉTAPE 1 — SCAN      : extraire + dédupliquer → palette 01-Fondation
 *   ÉTAPE 2 — QUALIFY   : dialogue de qualification sémantique (humain requis)
 *   ÉTAPE 3 — GENERATE  : création batchée des 3 niveaux (UN SEUL bloc execute_code)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 *   1. Passer STEP = 1, exécuter. Copier la sortie PALETTE_JSON.
 *   2. Coller PALETTE_JSON dans STEP2_INPUT, passer STEP = 2, exécuter.
 *      → L'agent pose les questions de qualification. Répondre dans ANSWERS.
 *   3. Coller les réponses dans STEP3_INPUT, passer STEP = 3, exécuter.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Gotchas intégrés :
 *   - shape.applyToken() / token.applyToShapes() → bugs #9162/#9641 — NE PAS UTILISER
 *   - openPage() ne change pas le viewport (bug #8520) → currentPage uniquement
 *   - addSet() + toggleActive() AVANT addToken() — sinon null silencieux
 *   - Étape 3 : Fondation → Semantic → Component en UN SEUL bloc
 *   - addToken() null sur duplicat → vérification d'existence systématique
 *   - column-reverse : paddings inversés (top↔bottom, left↔right)
 *   - cross-type aliases non supportés : color ne peut aliaser qu'un color
 *   - graphie exacte "01-Fondation" (sans 'u')
 */

const STEP = 1;                 // 1 | 2 | 3
const THEME_NAMESPACE = 'dark'; // namespace sémantique
const SIZE_SETS = ['Small', 'Medium', 'Large']; // résolutions à générer

// Valeurs hors grille 4px considérées intentionnelles (design system connus).
// MUI : 36, 38, 46, 58px sont des hauteurs standards.
// Ajouter ici toute valeur confirmée par le designer.
const OFF_GRID_ALLOWLIST = new Set([36, 38, 46, 58, 20, 18, 14, 10, 6, 2]);

// ─── ÉTAPE 2 : coller ici le PALETTE_JSON de l'étape 1 ──────────────────────
const STEP2_INPUT = null;

// ─── ÉTAPE 3 : coller ici le QUALIFICATION_JSON de l'étape 2 ────────────────
const STEP3_INPUT = null;

// ════════════════════════════════════════════════════════════════════════════
// ÉTAPE 1 — SCAN & PALETTE
// Objectif : extraire toutes les valeurs visuelles brutes,
//            les dédupliquer, les enrichir de leur contexte d'usage,
//            et présenter une palette structurée à qualifier.
// Output   : PALETTE_JSON à copier pour l'étape 2.
// ════════════════════════════════════════════════════════════════════════════

if (STEP === 1) {

  const lib = penpot.library.local;
  let roots = penpot.selection;
  if (roots.length === 0) {
    const comps = (lib.components ?? []).filter(c => !(c.isVariant && c.isVariant()));
    roots = comps.map(c => c.mainInstance?.() ?? c).filter(Boolean);
  }
  if (roots.length === 0)
    throw new Error('❌ Aucun composant. Sélectionner ou peupler la librairie locale.');

  const STATES = ['enabled', 'hovered', 'focused', 'pressed', 'disabled', 'default', 'active', 'error'];

  function detectState(name) {
    const n = (name ?? '').toLowerCase();
    return STATES.find(s => n.includes(s))
      ?? (n.includes('hover') ? 'hovered' : n.includes('focus') ? 'focused' : 'enabled');
  }

  // Table d'usages bruts
  // valueKey "color::#66bb6a" → [{component, element, state, prop, dimensional}]
  const usage = new Map();

  function record(cat, val, ctx) {
    const key = `${cat}::${String(val).toLowerCase()}`;
    if (!usage.has(key)) usage.set(key, []);
    usage.get(key).push(ctx);
  }

  function scan(shape, compName, rootName, depth = 0) {
    if (depth > 7) return;
    const el  = (shape.name ?? 'container').toLowerCase().replace(/\s+/g, '-');
    const state = detectState(shape.name) !== 'enabled'
      ? detectState(shape.name)
      : detectState(rootName);

    // Couleurs de fill
    (shape.fills ?? []).forEach(f => {
      if (!f.color || f.color === 'transparent') return;
      // FIX: filtrer les fills quasi-transparentes (opacity < 0.05 = invisible)
      if (f.opacity != null && f.opacity < 0.05) return;
      // FIX: arrondir à 3 décimales pour éviter 0.699999988079071
      const op  = f.opacity != null && f.opacity < 0.999
        ? Math.round(f.opacity * 1000) / 1000 : null;
      const val = op ? `${f.color.toLowerCase()}@${op}` : f.color.toLowerCase();
      record('color', val, { component: compName, element: el, state, prop: 'bg' });
    });

    // Couleurs de stroke
    (shape.strokes ?? []).forEach(s => {
      if (s.color) record('color', s.color.toLowerCase(),
        { component: compName, element: el, state, prop: 'border-color' });
      if (s.width) record('borderWidth', s.width,
        { component: compName, element: el, state: null, prop: 'border-width' });
    });

    // Radius
    if ((shape.borderRadius ?? 0) > 0)
      record('borderRadius', shape.borderRadius,
        { component: compName, element: el, state: null, prop: 'border-radius' });

    // Dimensions du root (taille composant)
    if (depth === 0) {
      record('sizing', Math.round(shape.height),
        { component: compName, element: el, state: null, prop: 'height', dimensional: true });
    }

    // Flex : paddings et gaps
    if (shape.flex) {
      const rev = /reverse/.test(shape.flex.dir ?? '');
      const pv  = rev ? shape.flex.paddingBottom : shape.flex.paddingTop;
      const ph  = rev ? shape.flex.paddingRight  : shape.flex.paddingLeft;
      if (pv > 0) record('spacing', pv,
        { component: compName, element: el, state: null, prop: 'padding-vertical', dimensional: true });
      if (ph > 0) record('spacing', ph,
        { component: compName, element: el, state: null, prop: 'padding-horizontal', dimensional: true });
      if ((shape.flex.rowGap ?? 0) > 0) record('spacing', shape.flex.rowGap,
        { component: compName, element: el, state: null, prop: 'gap', dimensional: true });
    }

    // Typographie
    if (shape.type === 'text' && shape.fontSize)
      record('fontSizes', shape.fontSize,
        { component: compName, element: el, state, prop: 'font-size' });

    (shape.children ?? []).forEach(c => scan(c, compName, rootName, depth + 1));
  }

  roots.forEach(r => {
    const name = (r.name.split('/')[0] ?? r.name).toLowerCase().trim().replace(/\s+/g, '-');
    scan(r, name, r.name);
  });

  // Nommage Fondation
  function fName(cat, val) {
    switch (cat) {
      case 'color': {
        const [hex, op] = String(val).split('@');
        const base = `color.palette.${hex.replace('#', '')}`;
        return op ? `${base}-${Math.round(parseFloat(op) * 100)}p` : base;
      }
      case 'spacing':      return `spacing.${val}`;
      case 'sizing':       return `sizing.${val}`;
      case 'borderRadius': return `radius.${val}`;
      case 'borderWidth':  return `border-width.${val}`;
      case 'fontSizes':    return `font-size.${val}`;
      default:             return `${cat}.${val}`;
    }
  }

  // Construction de la palette
  const palette = [];
  usage.forEach((uses, key) => {
    const [cat, val] = key.split('::');
    const name = fName(cat, val);

    // Résumé des usages pour aider la qualification
    const comps   = [...new Set(uses.map(u => u.component))];
    const states  = [...new Set(uses.map(u => u.state).filter(Boolean))];
    const props   = [...new Set(uses.map(u => u.prop))];
    const isDim   = uses.some(u => u.dimensional);
    const offGrid = ['spacing', 'sizing'].includes(cat)
      && Number(val) % 4 !== 0
      && !OFF_GRID_ALLOWLIST.has(Number(val));

    palette.push({
      fondationName: name,
      category: cat,
      value: val,
      usageCount: uses.length,
      components: comps.slice(0, 6),
      states: states.slice(0, 5),
      props: props.slice(0, 4),
      dimensional: isDim,
      offGrid: offGrid || undefined,
      // Champ à remplir en étape 2 :
      semanticRole: null,   // ex: "dark.primary.main" — null = à qualifier
    });
  });

  // Séparer couleurs, dimensions, autres pour la lisibilité du rapport
  const colors = palette.filter(p => p.category === 'color');
  const dims   = palette.filter(p => ['spacing', 'sizing'].includes(p.category));
  const others = palette.filter(p => !['color', 'spacing', 'sizing'].includes(p.category));

  console.log(`\n══════ ÉTAPE 1 — PALETTE ══════`);
  console.log(`Composants scannés : ${roots.length} | Valeurs uniques : ${palette.length}`);

  console.log(`\n── COULEURS (${colors.length}) ──`);
  console.table(colors.map(p => ({
    token: p.fondationName,
    valeur: p.value,
    'utilisé sur': p.usageCount,
    composants: p.components.join(', '),
    états: p.states.join(', '),
    props: p.props.join(', '),
  })));

  console.log(`\n── DIMENSIONS (${dims.length}) ──`);
  dims.forEach(p => {
    const warn = p.offGrid ? ' ⚠️ HORS GRILLE 4px' : '';
    console.log(`  ${p.fondationName} = ${p.value}  [${p.components.join(', ')}]${warn}`);
  });

  console.log(`\n── AUTRES (${others.length}) ──`);
  others.forEach(p =>
    console.log(`  ${p.fondationName} = ${p.value}  [${p.components.join(', ')}]`));

  const paletteJson = JSON.stringify(palette, null, 2);
  console.log(`\n══════ PALETTE_JSON — copier pour ÉTAPE 2 ══════`);
  console.log(paletteJson);

  console.log(`\n📋 ÉTAPE SUIVANTE :`);
  console.log(`  1. Copier le JSON ci-dessus`);
  console.log(`  2. Le coller dans STEP2_INPUT`);
  console.log(`  3. Passer STEP = 2 et exécuter`);
  if (palette.some(p => p.offGrid))
    console.warn(`\n⚠️ Valeurs hors grille 4px détectées — corriger dans le design AVANT de les figer en tokens.`);
}

// ════════════════════════════════════════════════════════════════════════════
// ÉTAPE 2 — QUALIFICATION SÉMANTIQUE
// Objectif : présenter chaque valeur et demander son rôle sémantique.
//            Aucune inférence automatique — l'humain qualifie.
// Output   : QUALIFICATION_JSON à copier pour l'étape 3.
// ════════════════════════════════════════════════════════════════════════════

if (STEP === 2) {

  if (!STEP2_INPUT) throw new Error('❌ Coller le PALETTE_JSON de l\'étape 1 dans STEP2_INPUT.');

  const palette = typeof STEP2_INPUT === 'string' ? JSON.parse(STEP2_INPUT) : STEP2_INPUT;
  const NS = THEME_NAMESPACE;

  // Rôles sémantiques canoniques proposés comme aide-mémoire
  const COLOR_ROLES = [
    `${NS}.primary.main`, `${NS}.primary.light`, `${NS}.primary.dark`,
    `${NS}.secondary.main`, `${NS}.secondary.light`, `${NS}.secondary.dark`,
    `${NS}.error.main`, `${NS}.warning.main`, `${NS}.info.main`, `${NS}.success.main`,
    `${NS}.text.primary`, `${NS}.text.secondary`, `${NS}.text.disabled`,
    `${NS}.background.default`, `${NS}.background.paper`, `${NS}.background.elevated`,
    `${NS}.action.hover`, `${NS}.action.focus`, `${NS}.action.pressed`,
    `${NS}.action.disabled`, `${NS}.action.disabledBackground`,
    `${NS}.divider`, `${NS}.border.main`, `${NS}.border.focus`,
    `${NS}.overlay.hover`, `${NS}.overlay.focus`, `${NS}.overlay.pressed`,
    'IGNORE',             // valeur à exclure des tokens
    'FONDATION_ONLY',     // reste en Fondation, pas de semantic
  ];

  console.log(`\n══════ ÉTAPE 2 — QUALIFICATION SÉMANTIQUE ══════`);
  console.log(`${palette.length} valeurs à qualifier.`);
  console.log(`\nRôles disponibles :\n  ${COLOR_ROLES.join('\n  ')}`);
  console.log(`\nPour chaque valeur : indiquer le semanticRole exact, "IGNORE" ou "FONDATION_ONLY".`);
  console.log(`Les dimensionnels ont déjà un rôle généré automatiquement — confirmer ou modifier.\n`);

  // Couleurs : qualification obligatoire (rôle non déductible sans contexte)
  const colors = palette.filter(p => p.category === 'color');
  console.log(`\n── COULEURS À QUALIFIER (${colors.length}) ──\n`);
  colors.forEach((p, i) => {
    const opacity = String(p.value).includes('@') ? ` (opacité ${String(p.value).split('@')[1]})` : '';
    console.log(`[${i + 1}] ${p.fondationName}`);
    console.log(`     Valeur   : ${p.value}${opacity}`);
    console.log(`     Usages   : ${p.usageCount}× sur [${p.components.join(', ')}]`);
    console.log(`     États    : ${p.states.join(', ') || '—'}`);
    console.log(`     Props    : ${p.props.join(', ')}`);
    console.log(`     → semanticRole : [À REMPLIR]`);
    console.log('');
  });

  // Dimensionnels : rôles générés, à confirmer / ajuster
  const dims = palette.filter(p => ['spacing', 'sizing'].includes(p.category));
  if (dims.length) {
    console.log(`\n── DIMENSIONS — rôles auto-générés à confirmer (${dims.length}) ──\n`);
    dims.forEach(p => {
      const sizeAbbr = 'sm'; // ajuster si plusieurs résolutions
      const autoRole = p.category === 'sizing'
        ? `${NS}.size.${p.components[0]}.${sizeAbbr}`
        : `${NS}.padding.${p.components[0]}-${sizeAbbr}.${p.props[0]?.replace('padding-', '') ?? 'vertical'}`;
      p.semanticRole = autoRole; // pré-rempli
      console.log(`  ${p.fondationName} = ${p.value}  →  ${autoRole}  [confirmer ou modifier]`);
    });
  }

  // Autres (radius, border-width, font-size) : rôles auto-générés simples
  const others = palette.filter(p => !['color', 'spacing', 'sizing'].includes(p.category));
  others.forEach(p => {
    const autoRole = p.category === 'borderRadius'
      ? `${NS}.radius.${p.components[0] ?? 'default'}`
      : p.category === 'borderWidth'
      ? `${NS}.border-width.default`
      : `${NS}.font-size.${p.value}`;
    p.semanticRole = autoRole;
  });

  console.log(`\n══════ INSTRUCTIONS ══════`);
  console.log(`1. Pour chaque couleur [À REMPLIR], noter le semanticRole choisi.`);
  console.log(`2. Modifier ci-dessous le JSON : compléter tous les semanticRole null.`);
  console.log(`3. Copier le JSON modifié dans STEP3_INPUT, passer STEP = 3.`);
  console.log(`\nUne valeur peut avoir PLUSIEURS rôles sémantiques (ex: même couleur`);
  console.log(`pour text.disabled et action.disabledBackground) — dupliquer l'entrée.`);

  // Pré-remplissage partiel pour faciliter l'édition
  const qualJson = JSON.stringify(palette, null, 2);
  console.log(`\n══════ QUALIFICATION_JSON — éditer puis copier pour ÉTAPE 3 ══════`);
  console.log(qualJson);
}

// ════════════════════════════════════════════════════════════════════════════
// ÉTAPE 3 — GÉNÉRATION
// Objectif : créer les 3 niveaux depuis le QUALIFICATION_JSON validé.
//            UN SEUL BLOC — ne jamais scinder cet execute_code.
// Prérequis : TOUS les semanticRole sont renseignés (aucun null).
// ════════════════════════════════════════════════════════════════════════════

if (STEP === 3) {

  if (!STEP3_INPUT) throw new Error('❌ Coller le QUALIFICATION_JSON de l\'étape 2 dans STEP3_INPUT.');

  const palette = typeof STEP3_INPUT === 'string' ? JSON.parse(STEP3_INPUT) : STEP3_INPUT;

  // Vérification : aucun null restant
  const unqualified = palette.filter(p => p.semanticRole === null && p.category === 'color');
  if (unqualified.length > 0) {
    console.error(`❌ ${unqualified.length} couleurs non qualifiées :`);
    unqualified.forEach(p => console.error(`   ${p.fondationName} (${p.value})`));
    throw new Error('Qualifier toutes les couleurs avant la génération. Retour étape 2.');
  }

  const lib      = penpot.library.local;
  const tokensLib = lib.tokens ?? penpot.tokens;

  // ─── Helper : création en chunks (max 10 ops/call recommandé) ───────────────
  // ⚠️ Batch size limit : ~10 opérations par appel execute_code
  // Au-delà, le plugin peut crasher ou ignorer silencieusement les opérations
  const CHUNK_SIZE = 10;

  function addTokensChunked(set, tokens) {
    const created = [], skipped = [];
    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      chunk.forEach(t => {
        const tok = set.addToken({ name: t.name, type: t.type, value: t.value });
        if (tok) created.push(t.name);
        else     skipped.push(t.name);
      });
      // Micro-pause entre chunks pour laisser respirer le plugin
      if (i + CHUNK_SIZE < tokens.length)
        console.log(`  ... chunk ${Math.floor(i/CHUNK_SIZE)+1}/${Math.ceil(tokens.length/CHUNK_SIZE)} (${i+CHUNK_SIZE}/${tokens.length})`);
    }
    return { created, skipped };
  }

  // ─── 01-Fondation ──────────────────────────────────────────────────────────
  // Valeurs LITTÉRALES uniquement — jamais d'alias ici.

  const fSet = tokensLib.addSet('01-Fondation');
  fSet.toggleActive();

  const fondationTokens = palette
    .filter(p => p.semanticRole !== 'IGNORE')
    .map(p => ({
      name:  p.fondationName,
      type:  p.category,
      value: String(p.value).split('@')[0],
    }));

  const { created: created01, skipped: skipped01 } = addTokensChunked(fSet, fondationTokens);
  console.log(`01-Fondation : ${created01.length} créés, ${skipped01.length} ignorés (duplicats)`);

  // ─── 02-Semantic ───────────────────────────────────────────────────────────
  // 100% alias vers 01-Fondation — jamais de valeur littérale ici.
  // ⚠️ Alias intra-type uniquement (color→color, spacing→spacing).

  const sSet = tokensLib.addSet('02-Semantic');
  sSet.toggleActive();

  // Construire la table semantic : role → {type, aliasTo}
  // Une valeur peut avoir plusieurs rôles (entrées dupliquées dans la palette)
  const semanticMap = new Map(); // roleName → {type, fondationName}
  palette
    .filter(p => p.semanticRole && p.semanticRole !== 'IGNORE' && p.semanticRole !== 'FONDATION_ONLY')
    .forEach(p => {
      // Gérer les rôles multiples (séparés par | dans la réponse de qualification)
      const roles = String(p.semanticRole).split('|').map(r => r.trim());
      roles.forEach(role => {
        if (!semanticMap.has(role))
          semanticMap.set(role, { type: p.category, fondationName: p.fondationName });
      });
    });

  const created02 = [];
  const skipped02 = [];

  const semanticTokens = [...semanticMap.entries()].map(([role, { type, fondationName }]) => ({
    name: role, type, value: `{${fondationName}}`,
  }));
  const { created: c02, skipped: s02 } = addTokensChunked(sSet, semanticTokens);
  created02.push(...c02); skipped02.push(...s02);

  console.log(`02-Semantic  : ${created02.length} créés, ${skipped02.length} ignorés`);

  // ─── 03-Component ──────────────────────────────────────────────────────────
  // Alias vers 02-Semantic (jamais vers 01-Fondation directement).
  // Split : Base/<Nom> (états) | <Size>/<Nom> (dimensionnel).

  // Table de lookup : fondationName → premier role semantic correspondant
  const fToSemantic = new Map();
  semanticMap.forEach(({ fondationName }, role) => {
    if (!fToSemantic.has(fondationName)) fToSemantic.set(fondationName, role);
  });

  // Regroupement des tokens par set composant
  const compSets = new Map(); // setName → [{name, type, value, viaSemantic}]

  // FIX bug #8 : suffixe de type pour éviter les conflits leaf/branch.
  // Penpot traite les noms de tokens comme des chemins — un token "input.label"
  // et un token "input.label.size" sont en conflit car "input.label" est à la fois
  // une feuille et un nœud intermédiaire.
  // Convention : suffixer le type quand le prop serait ambigu.
  const TYPE_SUFFIX = {
    color:       'Color',
    fontSizes:   'FontSize',
    spacing:     'Spacing',
    sizing:      'Size',
    borderRadius:'Radius',
    borderWidth: 'BorderWidth',
    opacity:     'Opacity',
  };

  function safeTokenName(baseName, category) {
    // Vérifier si un token du même set commence par baseName + '.'
    // (détection de conflit potentiel)
    return `${baseName}${TYPE_SUFFIX[category] ?? ''}`;
  }

  palette
    .filter(p => p.semanticRole !== 'IGNORE')
    .forEach(p => {
      (p.components ?? []).forEach(compName => {
        SIZE_SETS.forEach(size => {
          const isDim = p.dimensional;
          const cap   = compName.charAt(0).toUpperCase() + compName.slice(1);
          const setName = isDim
            ? `03-Component/${size}/${cap}`
            : `03-Component/Base/${cap}`;

          // Base du nom sans suffixe de type
          const baseName = isDim
            ? `${size.toLowerCase()}.${compName}.${(p.props[0] ?? 'size')}`
            : `${compName}.${(p.props[0] ?? 'bg')}`;

          // Nom final avec suffixe de type pour éviter le conflit leaf/branch
          const tokenName = safeTokenName(baseName, p.category);

          const semRole = fToSemantic.get(p.fondationName);
          const tokenValue = semRole
            ? `{${semRole}}`                           // alias via Semantic ✅
            : `{${p.fondationName}}`;                  // fallback direct — flagué

          if (!compSets.has(setName)) compSets.set(setName, []);
          const set = compSets.get(setName);
          if (!set.find(t => t.name === tokenName))
            set.push({
              name: tokenName,
              type: p.category,
              value: tokenValue,
              viaSemantic: !!semRole,
            });
        });
      });
    });

  const created03 = [];
  const direct03  = [];

  compSets.forEach((tokens, setName) => {
    const cSet = tokensLib.addSet(setName);
    cSet.toggleActive();
    const { created } = addTokensChunked(cSet, tokens);
    created.forEach(n => {
      created03.push(`${setName}/${n}`);
      const t = tokens.find(tk => tk.name === n);
      if (t && !t.viaSemantic) direct03.push(`${setName}/${n}`);
    });
  });

  console.log(`03-Component : ${created03.length} créés dans ${compSets.size} sets`);
  if (direct03.length)
    console.warn(`⚠️ ${direct03.length} tokens en alias direct Fondation (semantic manquant) — à requalifier :`);
  direct03.forEach(n => console.warn(`   ${n}`));

  // ─── Rapport final ─────────────────────────────────────────────────────────

  const total = created01.length + created02.length + created03.length;
  console.log(`\n══════ BOOTSTRAP TERMINÉ ══════`);
  console.log(`01-Fondation : ${created01.length} tokens`);
  console.log(`02-Semantic  : ${created02.length} tokens`);
  console.log(`03-Component : ${created03.length} tokens (${compSets.size} sets)`);
  console.log(`Total        : ${total} tokens`);
  if (direct03.length === 0)
    console.log(`✅ Chaîne complète : tous les composants passent par le Semantic.`);
  else
    console.log(`⚠️ ${direct03.length} tokens sans Semantic — lancer ÉTAPE 2 pour les requalifier.`);
  console.log(`\n📋 ÉTAPE SUIVANTE : penpot-token-pipeline APPLY pour lier les tokens aux composants.`);
}
