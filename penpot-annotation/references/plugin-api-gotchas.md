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

## 🔴 BUGS DÉCOUVERTS EN TEST (juin 2026, Penpot 2.15.4)

### ❌ `page.appendChild()` non disponible sur l'objet Page

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

### ⚠️ `addSet()` + `toggleActive()` AVANT `addToken()`

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

## 📋 Checklist avant tout nouveau script `execute_code`

```
□ Aucun appel à shape.applyToken() ou token.applyToShapes()    [bugs #9162/#9641]
□ Aucun appel à openPage() pour naviguer                        [bug #8520]
□ Utiliser page.root.appendChild() et non page.appendChild()   [bug session 1]
□ penpot.createBoard() et non penpot.createFrame()             [bug #6]
□ penpot.createPage() → renommer via page.name après création  [bug session 1]
□ switchVariant() : tester via typeof, pas via getPrototypeOf  [bug session 1]
□ CATALOG : exécuter depuis le fichier SOURCE de la librairie  [bug #7]
□ Noms de tokens : suffixer le type (labelColor, labelFontSize) [bug #8]
□ applyToken() async → préférer écriture directe sur .fills    [bug #9]
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
