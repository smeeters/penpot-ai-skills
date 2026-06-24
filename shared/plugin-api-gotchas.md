# Penpot Plugin API — Gotchas & Bugs connus

> Référence partagée par tous les skills du kit.
> Mise à jour : juin 2026 / Penpot 2.15.x
> Vérifier les issues GitHub avant toute mise à jour majeure de Penpot.

---

## 🔴 BUGS ACTIFS — méthodes à ne jamais utiliser

### ❌ `shape.applyToken()` — throw "check error" (issue #9162, #9641)

```javascript
// NE PAS UTILISER — throw ClojureScript assertion failure
shape.applyToken(token, ['fill']);

// NE PAS UTILISER — no-op silencieux (aucune erreur, aucun effet)
token.applyToShapes([shape], ['fill']);
```

**Workaround obligatoire** — écrire directement sur les propriétés :

```javascript
// ✅ Couleur de fill
shape.fills = [{ color: '#66bb6a' }];

// ✅ Couleur de stroke
shape.strokes = [{ color: '#66bb6a', width: shape.strokes?.[0]?.width ?? 1 }];

// ✅ Border radius
shape.borderRadius = 4;

// ✅ Opacité
shape.opacity = 0.5;
```

**Impact** : tout script qui appelle `applyToken` ou `applyToShapes`
ne produit aucune modification visible et ne lève aucune erreur —
le bug est silencieux, donc difficile à détecter sans vérification
post-application.

---

### ❌ `openPage()` — ne change pas le viewport (issue #8520)

```javascript
// NE PAS UTILISER pour naviguer entre pages
penpot.openPage(page); // complète sans erreur, viewport inchangé
```

**Impact** : les scripts qui tentent de modifier des composants
sur une page différente de la page courante échouent silencieusement.

**Workaround** : restreindre toutes les opérations à `penpot.currentPage`.
Pour un scan multi-pages, générer un rapport et demander à l'utilisateur
de naviguer manuellement vers chaque page.

```javascript
// ✅ Toujours opérer sur la page courante
const page = penpot.currentPage;
```

---

### ❌ Modifications sur composants d'une autre page ne persistent pas (issue #8520)

Les setters (`fontFamily`, `rotation`, `fills`…) sur les enfants d'un
composant dont le main instance est sur une autre page :
- acceptent la valeur sans erreur
- le getter retourne la nouvelle valeur
- mais la modification disparaît au rechargement

**Workaround** : naviguer manuellement vers la page du composant avant
d'exécuter le script, vérifier avec `penpot.currentPage.name`.

---

## ✅ COMPORTEMENTS CONFIRMÉS EN TEST TERRAIN (18/06/2026)

```javascript
s.fills           // accessible en lecture ✅
s.tokens          // accessible en lecture, retourne {} si vide ✅
board.borderRadius // lecture/écriture ✅
penpot.selection.slice() // capture de la sélection ✅
page.root.appendChild()  // requis (page.appendChild absent) ✅
alignItems: 'center'     // ✅ fonctionne
justifyContent: 'center' // ✅ fonctionne

// componentId / mainComponentId → NON exposés par l'API Plugin
// Heuristique fiable : nom contenant '/' (convention MUI/Carbon)
const isComp = shape.isComponentInstance?.() || /\//.test(shape.name ?? '');
```

---

## 🔴 BUGS DÉCOUVERTS EN TEST (juin 2026, Penpot 2.15.4)

### ❌ `shape.verticalSizing = 'auto'` invalide en API → erreur :error

```javascript
// NE PAS UTILISER — provoque une erreur :error
screen.verticalSizing = 'auto';

// ✅ Workaround : calculer la hauteur manuellement
// ⚠️ BUG 2 : child.y = 0 juste après appendChild en flex layout
//    Le moteur ne calcule pas les positions immédiatement
//    → Ne pas utiliser child.y pour calculer la hauteur
//    → Utiliser des constantes basées sur le contenu

const FIELD_HEIGHT = 68; // label + gap + input
const itemCount = children.length;
const height = PADDING_V + (itemCount * FIELD_HEIGHT) + (itemCount - 1) * GAP;
board.resize(board.width, Math.max(height, 200));
```

---

### ⚠️ `addFlexLayout()` échoue si le board est déjà un board flex

```javascript
// ⚠️ Erreur si addFlexLayout() appelé sur un board déjà en flex
board.addFlexLayout(); // → error: layout already exists

// ✅ Workaround : wrapper try/catch (déjà dans applyFlex())
function applyFlex(board, props) {
  try { board.addFlexLayout(); } catch(e) { /* déjà présent — ignorer */ }
  // ...
}
```

---

### ⚠️ `remove()` + `resize()` dans le même bloc → erreur générique

```javascript
// ⚠️ Combiner remove() et resize() dans le même execute_code peut planter
page.root.removeChild(existing);
screen.resize(width, height); // → erreur :error générique

// ✅ Séparer en deux blocs execute_code distincts
// Bloc 1 : remove() uniquement
// Bloc 2 : création et resize()
```

---

```javascript
// ⚠️ Si currentPage ≠ page cible, les shapes sont créés sur la mauvaise page
// Les enfants s'éparpillent — le board parent apparaît vide

// ✅ Garde obligatoire en début de script
const TARGET_PAGE = 'Screen-Builder';
if (penpot.currentPage.name !== TARGET_PAGE) {
  throw new Error(`❌ Naviguer sur "${TARGET_PAGE}" avant d'exécuter.`);
}

// ✅ Ou utiliser TARGET_PAGE = null pour désactiver la vérification
```

**Impact** : `build-screen.js`, `generate-variants.js`, tout script créant
des shapes sur une page spécifique.

---

### ⚠️ `remove()` inopérant sur shapes d'une page non-courante

```javascript
// ⚠️ remove() ne fonctionne que sur la page COURANTE
const otherPage = penpot.currentFile.pages.find(p => p.name === 'Autre');
const shape = otherPage.root.children.find(s => s.name === 'test');
shape.remove(); // → silencieux, rien ne se passe

// ✅ Naviguer sur la page cible avant de supprimer
// (limitation API — pas de workaround connu)
```

---

```javascript
// ⚠️ Les propriétés de l'action ne sont pas lisibles après addInteraction()
shape.addInteraction({ trigger: 'click', action: { type: 'navigate-to', destination: board } });

const interactions = shape.interactions;
interactions[0].action.destination;  // → undefined ou objet vide
interactions[0].action.animation;    // → undefined
interactions[0].action.type;         // → ✅ lisible (seul champ fiable)
interactions[0].trigger;             // → ✅ lisible

// ✅ Seuls trigger et action.type sont fiables en lecture
// Pour l'audit, marquer dest et animation comme 'N/A (API)'
```

**Impact** : `audit-interactions.js` — colonnes dest/animation marquées N/A.
La détection des "boards non atteignables" via `destination.id` est désactivée.

---

```javascript
// Penpot transforme automatiquement "Dialog/Confirmation"
// en "Dialog / Confirmation" (espaces autour du slash)
// → la recherche par nom exact échoue

// ❌ Échoue si le nom contient un slash
const shape = shapes.find(s => s.name === 'Dialog/Confirmation'); // null

// ✅ Normaliser avant comparaison
function normalize(s) {
  return (s ?? '').replace(/\s*\/\s*/g, ' / ').trim().toLowerCase();
}
const shape = shapes.find(s => normalize(s.name) === normalize('Dialog/Confirmation'));
```

**Impact** : `findShapeByName()` dans `add-overlays.js`, `catalog-library.js`,
et tout script cherchant des shapes par nom contenant `/`.

---

```javascript
// NE PAS UTILISER — retourne [] même si la page a des shapes
const shapes = penpot.currentPage.children;

// ✅ Workaround : passer par page.root
const shapes = penpot.currentPage.root.children;
// ou
const shapes = penpot.currentPage.root?.children ?? [];
```

**Impact** : `audit-interactions.js`, `clean-annotations.js`, et tout script
qui scanne les shapes de la page courante.

---

```javascript
// NE PAS UTILISER — TypeError: page.appendChild is not a function
const page = penpot.currentPage;
page.appendChild(shape);

// ✅ Workaround : passer par page.root
page.root.appendChild(shape);
```

---

### ❌ `penpot.createPage(name)` ignore le paramètre name

```javascript
// NE PAS UTILISER — le nom est ignoré, page créée sans nom
const page = penpot.createPage('Ma Page');
console.log(page.name); // "" ou "Page 1"

// ✅ Workaround : renommer après création
const page = penpot.createPage();
page.name = 'Ma Page';
```

---

### ⚠️ `switchVariant()` non visible via `getPrototypeOf()` mais callable

```javascript
// FAUX NÉGATIF — ne pas utiliser pour tester l'existence
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance));
methods.includes('switchVariant'); // false — même si la méthode existe

// ✅ Tester via typeof directement
typeof instance.switchVariant === 'function'; // true si disponible
if (typeof instance.switchVariant === 'function') {
  instance.switchVariant(0, 'hovered');
}
```

---

## 🔴 BUGS DÉCOUVERTS EN TEST SESSION 2 (juin 2026, Penpot 2.15.4)

### ❌ `penpot.createFrame()` n'existe pas (bug #6)

```javascript
// NE PAS UTILISER — TypeError: penpot.createFrame is not a function
const frame = penpot.createFrame();

// ✅ Workaround : utiliser createBoard()
const frame = penpot.createBoard();
frame.name = 'Mon Frame';
```

---

### ❌ `library.connected[x].components` retourne 0 depuis un fichier externe (bug #7)

```javascript
// Retourne toujours [] depuis un fichier consommateur de la librairie
const lib = penpot.library.connected[0];
lib.components.length; // → 0

// ✅ Workaround : exécuter depuis le fichier SOURCE de la librairie
// → Ouvrir le fichier propriétaire, puis LIBRARY = 'local'
```

**Impact sur catalog-library.js** : doit être lancé depuis le fichier
qui contient la bibliothèque, pas depuis un fichier consommateur.

---

### ❌ Conflit leaf/branch dans les noms de tokens (bug #8)

```javascript
// ❌ Conflit — addToken() retourne null sur le second token
set.addToken({ name: 'input.label',      type: 'color',     value: '#fff' });
set.addToken({ name: 'input.label.size', type: 'fontSizes', value: '14'  }); // null

// ✅ Suffixer le type pour lever l'ambiguïté
set.addToken({ name: 'input.labelColor',    type: 'color',     value: '#fff' });
set.addToken({ name: 'input.labelFontSize', type: 'fontSizes', value: '14'  });
```

Convention appliquée dans bootstrap-tokens.js :
`Color` · `FontSize` · `Spacing` · `Size` · `Radius` · `BorderWidth` · `Opacity`

---

### ⚠️ `applyToken()` est asynchrone — lecture immédiate de `shape.tokens` = vide (bug #9)

```javascript
// ⚠️ shape.tokens vide si lu immédiatement
shape.applyToken(token, ['fill']);
console.log(shape.tokens); // []

// ✅ Attendre si lecture nécessaire
await new Promise(r => setTimeout(r, 200));
console.log(shape.tokens); // [{...}]

// ✅ Préférer l'écriture directe — synchrone et sans ce bug
shape.fills = [{ color: resolvedValue }];
```

Note : apply-tokens.js et bootstrap-tokens.js utilisent l'écriture directe
— ce bug ne les affecte pas.

---

## 🔴 BUGS DÉCOUVERTS EN TEST SESSION V2 (juin 2026, Penpot 2.15.4)

### ❌ API-1 — `board.flex = {...}` silencieusement ignoré

```javascript
// NE PAS UTILISER — l'assignation est ignorée sans erreur
board.flex = { dir: 'column', paddingTop: 16 };

// ✅ Workaround : addFlexLayout() puis propriétés une par une
board.addFlexLayout();
// ⚠️ Lire board.flex APRÈS addFlexLayout() — il est null avant
const f = board.flex;
if (f) {
  f.dir        = 'column';
  f.paddingTop = 16;  // ← sur f (board.flex), jamais sur board directement
  f.rowGap     = 8;
}
// ❌ Ne PAS faire : const f = board.flex ?? board;
//    Si board.flex est null, les paddings s'assignent sur board → ignorés
```

---

### ❌ API-2 — `alignItems: 'flex-start'` invalide

```javascript
// NE PAS UTILISER — valeurs CSS standard non reconnues
board.flex.alignItems = 'flex-start';
board.flex.alignItems = 'flex-end';

// ✅ Workaround : valeurs courtes
board.flex.alignItems    = 'start';  // au lieu de 'flex-start'
board.flex.alignItems    = 'end';    // au lieu de 'flex-end'
board.flex.alignItems    = 'center'; // inchangé
board.flex.alignItems    = 'stretch'; // inchangé
```

---

### ⚠️ API-3 — `fontWeight = '600'` non supporté (police par défaut)

```javascript
// Peut échouer silencieusement selon la police active
shape.fontWeight = '600';

// ✅ Utiliser les valeurs standards disponibles : 400, 500, 700
shape.fontWeight = 500; // Medium
shape.fontWeight = 700; // Bold
// Ou ne pas définir (laisser la valeur par défaut 400)
```

---

### ⚠️ API-FONT — Pas d'API `getInstalledFonts()` — vérification par test

```javascript
// ❌ N'existe pas dans le plugin API
penpot.getInstalledFonts(); // undefined

// ✅ Détecter via test d'assignation
function isFontAvailable(fontFamily) {
  try {
    const test = penpot.createText('.');
    test.fontFamily = fontFamily;
    const ok = test.fontFamily === fontFamily;
    try { penpot.currentPage.root.removeChild(test); } catch(e) {}
    return ok;
  } catch(e) { return false; }
}

// ✅ Pattern setFontSafe avec fallback
function setFontSafe(shape, font, fallback = 'Source Sans Pro') {
  try {
    shape.fontFamily = font;
    if (shape.fontFamily !== font) {
      shape.fontFamily = fallback;
      console.warn(`⚠️ Police "${font}" absente → fallback "${fallback}"`);
    }
  } catch(e) { try { shape.fontFamily = fallback; } catch(e2) {} }
}
```

**Polices confirmées disponibles (test terrain 18/06/2026, fichier MUI v5.4 Dark) :**
- `'Roboto'` ✅ — disponible
- `'Roboto Mono'` ✅ — disponible
- `'Inter'` ✅ — disponible
- `'Source Sans Pro'` ❌ — NON disponible dans les fichiers MUI

Utiliser `'Roboto'` comme fallback sansSerif par défaut (pas `'Source Sans Pro'`).

---

### ❌ API-4 — `shape.characters = ''` échoue silencieusement

```javascript
// NE PAS UTILISER — Penpot refuse les textes vides
shape.characters = '';

// ✅ Workaround : espace ou placeholder
shape.characters = ' ';       // visuellement vide
shape.characters = '[vide]';  // placeholder visible pour tests
```

---

### ⚠️ API-5 — `toLocaleDateString('fr-FR')` retourne anglais dans le plugin

```javascript
// ⚠️ La locale n'est pas disponible dans le contexte plugin
new Date().toLocaleDateString('fr-FR'); // → "6/15/2026" (format US)

// ✅ Formater manuellement
function formatDateFR(d) {
  return [
    d.getDate().toString().padStart(2, '0'),
    (d.getMonth() + 1).toString().padStart(2, '0'),
    d.getFullYear(),
  ].join('/');
}
// → "15/06/2026"
```

---

### ⚠️ API-6 — `library.connected[n].components` = 0 au chargement initial

```javascript
// ⚠️ Retourne tableau vide si la lib n'est pas encore chargée dans l'UI
penpot.library.connected[0].components; // → []

// ✅ Workaround : chercher dans local ET connected
const allComponents = [
  ...(penpot.library.local.components ?? []),
  ...(penpot.library.connected ?? []).flatMap(l => l.components ?? []),
];
// Si toujours vide → ouvrir le panneau Assets dans Penpot et
// s'assurer que la librairie est connectée via l'UI avant d'exécuter
```

---

### ⚠️ API-7 — `penpot.selection` perdu entre appels `execute_code`

```javascript
// ⚠️ La sélection n'est pas persistante entre deux blocs execute_code
// Bloc 1 : penpot.selection = [monShape]; → OK dans ce bloc
// Bloc 2 : penpot.selection → [] (perdu)

// ✅ Workaround : stocker l'ID et retrouver via penpotUtils
// Bloc 1 :
const id = penpot.selection[0]?.id;
// (stocker dans une variable de session ou dans le prompt)

// Bloc 2 :
const shape = penpotUtils.findShape(penpot.currentPage, s => s.id === id);
penpot.selection = [shape];
```

---

```javascript
// ❌ addToken() retourne null silencieusement si le set est inactif
const set = tokensLib.addSet('mon-set');
set.addToken({ name: 'color.primary', type: 'color', value: '#000' }); // null !

// ✅ toggleActive() d'abord
const set = tokensLib.addSet('mon-set');
set.toggleActive(); // ← OBLIGATOIRE
set.addToken({ name: 'color.primary', type: 'color', value: '#000' }); // ok
```

### ⚠️ Tout dans UN SEUL bloc `execute_code`

Sets créés dans un premier bloc + tokens insérés dans un second bloc :
les tokens retournent null. Sets sans tokens ne persistent pas entre
les appels. **Tout le batch doit tenir dans un seul `execute_code`.**

### ⚠️ `addToken()` retourne null sur duplicat (silencieux)

```javascript
const tok = set.addToken({ name: 'existing-token', ... });
if (!tok) console.warn('⚠️ null — duplicat ou set inactif');
// Ne jamais supposer qu'un addToken() réussit sans vérifier le retour
```

### ⚠️ Alias cross-type non supportés

```javascript
// ❌ color ne peut pas aliaser un token de type opacity
{ name: 'color.with-opacity', type: 'color', value: '{opacity.50}' } // null

// ✅ alias intra-type uniquement
{ name: 'color.primary', type: 'color', value: '{color.palette.66bb6a}' } // ok
{ name: 'spacing.md',    type: 'spacing', value: '{spacing.8}' }          // ok
```

### ⚠️ `flex.verticalSizing = 'auto'` ne propage pas au parent (issue #8520)

```javascript
// ❌ Le board retient ses dimensions malgré le setter
shape.flex.verticalSizing = 'auto';
console.log(shape.height); // toujours la valeur précédente

// ✅ Recalculer manuellement la hauteur du parent
function recalcParentHeight(parent) {
  if (!parent) return;
  const kids = parent.children ?? [];
  const bottom = kids.reduce((max, k) => Math.max(max, k.y + k.height), 0);
  const top    = kids.reduce((min, k) => Math.min(min, k.y), Infinity);
  parent.resize(parent.width, bottom - top + (parent.flex?.paddingTop ?? 0) + (parent.flex?.paddingBottom ?? 0));
}
recalcParentHeight(shape.parent);
```

### ⚠️ `column-reverse` inverse paddings et ordre d'ajout

```javascript
// Dans un flex column-reverse :
// - paddingTop  visuel = paddingBottom logique
// - paddingBottom visuel = paddingTop logique
// - les enfants sont ajoutés dans l'ordre inverse de leur position visuelle

// ✅ Lire depuis flex en tenant compte du reverse
const reversed = /reverse/.test(shape.flex?.dir ?? '');
const paddingVertical   = reversed ? shape.flex.paddingBottom : shape.flex.paddingTop;
const paddingHorizontal = reversed ? shape.flex.paddingRight  : shape.flex.paddingLeft;
```

### ⚠️ `.detach()` est irréversible

```javascript
// ❌ Sans garde-fou
instance.detach(); // rompt définitivement le lien au master

// ✅ Toujours gater avec une constante et un log
const DETACH_APPROVED = false; // ← true uniquement avec accord explicite
if (DETACH_APPROVED) {
  instance.detach();
  console.log('⚠️ Instance détachée — lien au master rompu définitivement.');
} else {
  console.warn('⏸ detach() requis — passer DETACH_APPROVED = true après accord.');
}
```

### ⚠️ `isVariant()` requis pour filtrer les variants

```javascript
// ❌ Inclut les variants dans la liste des composants principaux
const comps = penpot.library.local.components;

// ✅ Filtrer explicitement
const mains    = comps.filter(c => !(c.isVariant && c.isVariant()));
const variants = comps.filter(c =>   c.isVariant && c.isVariant());
```

### ⚠️ `switchVariant(index, value)` — index positionnel, jamais deviné

```javascript
// ❌ L'index 0 n'est pas forcément "state"
instance.switchVariant(0, 'hovered'); // peut cibler n'importe quel axe

// ✅ Lire l'index depuis le manifest penpot-library-mapper
const axisDef = manifest.variantAxes.find(a => a.axis === 'state');
instance.switchVariant(axisDef.index, 'hovered');
```

### ⚠️ Texte d'une instance non détachée = lié au master

```javascript
// ❌ Modification silencieusement ignorée ou propagée au master
textShape.characters = 'Nouveau label'; // si l'instance n'est pas détachée

// ✅ Vérifier avant de modifier le texte
if (shape.isComponentInstance?.() && !shape.isDetached?.()) {
  // detach() requis — voir contrainte ci-dessus
}
```

### ⚠️ Graphie exacte `01-Fondation` (sans 'u')

```javascript
// ❌ Orthographe anglaise — set non reconnu dans les thèmes Tokens Studio
tokensLib.addSet('01-Foundation');

// ✅ Graphie française de la librairie de référence
tokensLib.addSet('01-Fondation');
```

---


---

## G4 — `fills = [{ color: '#...' }]` invalide — utiliser `fillColor`

```javascript
// ❌ Format invalide — silencieusement ignoré
shape.fills = [{ color: '#1976d2' }];

// ✅ Format correct
shape.fills = [{ fillColor: '#1976d2', fillOpacity: 1 }];

// ✅ Avec opacité
shape.fills = [{ fillColor: '#ffffff', fillOpacity: 0.08 }];
```

**Impact** : `annotate-frame.js`, `build-screen.js`, `generate-variants.js`
et tous les scripts créant des shapes avec des couleurs de fond.
Corrigé dans les scripts v1.1 (18/06/2026).

---

## 📋 Checklist avant tout nouveau script `execute_code`

```
□ Aucun appel à shape.applyToken() ou token.applyToShapes()    [bugs #9162/#9641]
□ Aucun appel à openPage() pour naviguer                        [bug #8520]
□ Utiliser page.root.appendChild() et non page.appendChild()   [bug session 1]
□ verticalSizing = 'auto' invalide → calculer hauteur manuellement        [nouveau]
□ child.y = 0 après appendChild flex → utiliser constantes, pas positions  [nouveau]
□ addFlexLayout() sur board déjà flex → try/catch                          [nouveau]
□ remove() + resize() même bloc → séparer en 2 execute_code               [nouveau]
□ create*() crée sur currentPage → garde TARGET_PAGE en début de script    [nouveau]
□ remove() inopérant hors page courante → naviguer d'abord              [nouveau]
□ inter.action.destination/.animation : non lisibles → marquer N/A     [nouveau]
□ Noms avec / : Penpot normalise → "A/B" devient "A / B"        [nouveau]
□ page.children → page.root.children pour scanner les shapes    [nouveau]
□ penpot.createPage() → renommer via page.name après création  [bug session 1]
□ switchVariant() : tester via typeof, pas via getPrototypeOf  [bug session 1]
□ CATALOG : local + connected (pas local seul)                 [bug #7 / API-6]
□ Noms de tokens : suffixer le type (labelColor, labelFontSize) [bug #8]
□ applyToken() async → préférer écriture directe sur .fills    [bug #9]
□ b.flex = {...} ignoré → addFlexLayout() + prop par prop      [API-1]
□ alignItems : 'start'/'end' et non 'flex-start'/'flex-end'   [API-2]
□ fontWeight : 400 / 500 / 700 uniquement                      [API-3]
□ fontFamily : setFontSafe() avec fallback 'Source Sans Pro'   [API-FONT]
□ fontId : volatile entre sessions — ne pas stocker            [API-FONT]
□ shape.characters = '' échoue → utiliser ' '                 [API-4]
□ toLocaleDateString() → formater manuellement                 [API-5]
□ penpot.selection perdu entre blocs → stocker l'ID           [API-7]
□ addSet() + toggleActive() avant tout addToken()
□ Tout le batch dans UN SEUL execute_code
□ addToken() : vérifier le retour !== null
□ Alias intra-type uniquement
□ verticalSizing auto → recalcul manuel du parent
□ column-reverse → paddings compensés
□ detach() → gating DETACH_APPROVED
□ switchVariant → index lu depuis manifest
□ Graphie "01-Fondation"
□ fillOpacity : Math.round(op * 1000) / 1000
□ fills opacity < 0.05 → ignorer (transparent)
```

---

## Références

- Bug #9162 : https://github.com/penpot/penpot/issues/9162
- Bug #9641 : https://github.com/penpot/penpot/issues/9641
- Bug #8520 : https://github.com/penpot/penpot/issues/8520
- API Plugin officielle : https://help.penpot.app/plugins/getting-started/
