---
id: penpot-token-pipeline
name: penpot-token-pipeline
version: 0.3.0
mode: review
audiences: ["design-system", "design-engineer"]
description: >
  Bidirectional token workflow on a 3-level architecture
  (01-Fondation → 02-Semantique → 03-Composants). BOOTSTRAP: generate the full
  structure from a token-less library. EXTRACT: generate tokens from selected
  component(s). APPLY: bind tokens to component properties. Triggers on:
  "extraire les tokens", "tokeniser ce composant", "appliquer les tokens",
  "générer la structure de tokens", "bootstrap tokens", "token pipeline".
reference-library: tokens2026.json (Tokens Studio format)
---

# penpot-token-pipeline — Production de tokens 3 niveaux

> Workflow bidirectionnel : **EXTRACT** (composants → tokens) et **APPLY**
> (tokens → composants), conforme à l'architecture de `tokens2026.json`.

---

## 0. Architecture de référence (NON NÉGOCIABLE)

Cette règle s'applique à **toute opération de création ou d'application de
tokens**, quelle que soit la librairie, le projet ou l'outil utilisé.
Voir `references/token-architecture-rule.md` pour la spécification complète.

```
01-Fondation                      valeurs brutes uniquement — jamais d'alias
  color.gray.700: #1C2127
  color.blue.400: #4C90F0
  spacing.8: 8
  opacity.8: 0.08

02-Semantique                     100% aliases vers 01-Fondation uniquement
  color.surface.app: {color.gray.700}
  color.text.primary: {color.gray.50}
  action.hover: rgba(255,255,255,0.08)   ← littéral complexe acceptable si
                                            aucun primitif 01 ne peut l'exprimer

03-Composants                     aliases vers 02-Semantique uniquement
  accordion.bg: {color.surface.panel}
  accordion.text: {color.text.primary}
  accordion.bg-hover: {action.hover}
  accordion.text-disabled: {color.text.disabled}
```

### Noms de sets Penpot (projet Astralan)

| Niveau | Nom du set dans Penpot Tokens |
|---|---|
| Fondation | `01-Fondation` |
| Sémantique | `02-Semantique` |
| Composants | `03-Composants` |

L'ordre de chargement dans `$metadata.tokenSetOrder` doit toujours être :
`01-Fondation` → `02-Semantique` → `03-Composants`. Ne jamais réorganiser.

### Règles de chaînage strictes

| Niveau | Peut référencer | Ne peut JAMAIS référencer |
|--------|-----------------|---------------------------|
| 01-Fondation | rien (valeurs littérales) | tout alias |
| 02-Semantique | 01-Fondation | 03-Composants, lui-même en cross-type |
| 03-Composants | 02-Semantique | 01-Fondation directement, autres composants |

### Exemples — valide vs interdit

```
✅ CORRECT — chaîne complète
accordion.text → {color.text.primary} → {color.gray.50} → #F6F7F9

❌ INTERDIT — saut de niveau (03 → 01)
accordion.text → {color.gray.50}

❌ INTERDIT — valeur littérale dans 03-Composants
accordion.text → #F6F7F9

❌ INTERDIT — valeur littérale dans 02-Semantique
color.text.primary → #F6F7F9

❌ INTERDIT — application d'un token 02 directement sur un composant Penpot
  → Créer d'abord le token 03-Composants correspondant, puis appliquer
```

### Procédure en cas de token 03-Composants manquant (workflow APPLY)

Avant d'appliquer un token à un shape ou composant Penpot :
1. Vérifier que le token appartient à `03-Composants`
2. Si le meilleur candidat est dans `02-Semantique` → créer le token
   `03-Composants` qui le référence, puis appliquer ce nouveau token
3. Ne jamais appliquer un token `01-Fondation` ou `02-Semantique`
   directement sur un composant — même en urgence, même provisoirement

### Conventions de nommage

```
03-Composants :  <composant>.<élément>.<propriété>-<état>
                 accordion.bg
                 accordion.bg-hover
                 accordion.text-disabled
                 button.contained.bg.primary
                 textfield.border-focus

02-Semantique :  <type>.<domaine>.<rôle>
                 color.surface.panel
                 color.text.primary
                 color.intent.primary
                 action.hover
                 size.button.md

01-Fondation :   <type>.<famille>.<échelle>
                 color.gray.600
                 spacing.16
                 opacity.8
```

États canoniques : `enabled | hovered | focused | pressed | disabled`

⚠️ **Gotcha Penpot** : les cross-références entre types différents
(color→opacity, etc.) ne sont pas supportées — alias intra-type uniquement,
littéraux sinon.

---

## 1. WORKFLOW A — EXTRACT (composants → tokens)

### Brief Contract

- **Input** : sélection Penpot (1 composant ou série), ou nom de composant
- **Output** : tokens créés dans les bons sets + rapport de mapping
- **Constraint** : ne JAMAIS créer un token qui existe déjà (vérifier avant)
- **Acceptance** : chaque valeur visuelle du composant est soit mappée à un
  token existant, soit un nouveau token est proposé au bon niveau

### Étapes

**A1 — Inventaire de la sélection**
```javascript
// execute_code
const sel = penpot.selection;
if (sel.length === 0) throw new Error("Sélectionner au moins un composant");
// Pour les variants : filtrer avec .isVariant && c.isVariant()
```

**A2 — Extraction des propriétés visuelles**
Pour chaque shape (récursif sur les enfants) :
- `fills[].color`, `strokes[].color` + opacity → candidats **color**
- `borderRadius` → candidats **borderRadius**
- `width/height` → candidats **sizing**
- paddings du flex layout → candidats **spacing**
- `fontSize/fontWeight/lineHeight/fontFamily` → candidats **typography**
- `shadows` → candidats **shadow**

⚠️ Si flex `column-reverse` : l'ordre visuel et les paddings sont inversés —
compenser avant d'extraire.

**A3 — Résolution montante (matching)**
Pour chaque valeur extraite, dans cet ordre :
1. Existe-t-il un token **03-Composants** du même composant avec cette valeur ? → réutiliser
2. Existe-t-il un token **02-Semantique** résolvant à cette valeur ? → créer le
   token composant en alias : `{color.surface.panel}`
3. Existe-t-il un token **01-Fondation** avec cette valeur ? → proposer d'abord
   la création du semantic manquant, puis chaîner
4. Rien ne matche → **CHECKPOINT** : proposer la création Fondation + Semantique +
   Composants (jamais créer une valeur orpheline directement en composant)

**A4 — Classement par niveau et par set**
- Propriétés d'état (couleurs hover/focus/disabled, etc.) → `03-Composants`
- Propriétés dimensionnelles → `03-Composants` (référençant `02-Semantique`)

**A5 — Création batchée** (voir `scripts/extract-tokens.js`)
⚠️ Gotchas API impératifs :
- `addSet()` PUIS `toggleActive()` AVANT tout `addToken()` (sinon null)
- Création de set + insertion des tokens dans **UN SEUL** bloc execute_code
- `addToken()` retourne silencieusement null sur nom dupliqué — vérifier
  l'existence avant, ne jamais compter sur l'écrasement

**A6 — CHECKPOINT — Rapport de mapping**
```
## Extraction — Accordion/Default
| Propriété | Valeur | Token créé/réutilisé | Niveau | Statut |
|-----------|--------|----------------------|--------|--------|
| fill (bg) | #252A31 | accordion.bg → {color.surface.panel} | new component | 🆕 |
| fill (text) | #F6F7F9 | accordion.text → {color.text.primary} | new component | 🆕 |
| fill (hover) | rgba(255,255,255,0.08) | accordion.bg-hover → {action.hover} | new component | 🆕 |
| height | 48 | ⚠️ aucun match — proposer size.height.48 + size.accordion | new chain | ❓ |
```
Attendre validation avant A5 si des créations Fondation/Semantique sont proposées.

---

## 2. WORKFLOW B — APPLY (tokens → composants)

### Brief Contract

- **Input** : sélection + (set de tokens cible OU "auto" pour détection par nom)
- **Output** : propriétés du composant liées aux tokens + rapport
- **Constraint** : ne jamais modifier le master d'une instance sans `.detach()`
  explicite et approuvé
- **Acceptance** : zéro valeur hardcodée restante sur les propriétés couvertes
  par le set

### Étapes

**B1 — Résolution du set cible**
- Si le composant s'appelle `Accordion` → chercher `03-Composants` tokens
  prefixés `accordion.*`
- Lister les thèmes actifs pour déterminer la résolution courante

**B2 — Construction de la table de binding**
Parcourir les tokens du set et matcher sur la structure du shape :
```
accordion.bg              → fill du board racine
accordion.text            → fill des shapes texte enfants
accordion.bg-hover        → fill du board en état hovered
accordion.text-disabled   → fill des textes en état disabled
```
Le matching élément se fait par nom de calque — si les calques ne sont pas
nommés sémantiquement, **STOP** : proposer d'abord un passage de
`penpot-rename-layers`.

### B2bis — Garde-fous terrain (NON SKIPPABLES)

Règles issues de sessions de production réelles. Les ignorer provoque des
erreurs silencieuses, des doublons, et des heures de correction manuelle.
Appliquer chaque point, dans l'ordre. Détails, causes et procédures de
récupération : voir `references/apply-pitfalls.md`.

**G1. Auditer `fills` ET `strokes` dès le départ**
L'audit initial DOIT collecter les deux. Les bordures, contours (Outlined),
underlines (Link) et séparateurs (ButtonGroup) sont des `strokes`, pas des
`fills`. Un audit fills-only laisse la moitié du composant non tokenisé.

**G2. Classifier par `shape.type` AVANT de choisir le token**
- `text` → token texte (`*.text.*`)
- `path` / `vector` → token icône (`*.icon.*`), JAMAIS un token texte
- `board` sans fill (`fills: []`) → conteneur, ignorer (ne pas tokeniser le vide)

Créer un token icône distinct du token texte même si la couleur est
identique : le rôle sémantique diffère et divergera un jour.

**G3. Garde-fou toggle — TOUJOURS vérifier avant d'appliquer**
`applyToken` se comporte comme un TOGGLE : l'appeler sur un shape qui porte
déjà ce token le RETIRE. Toujours :

```js
if (shape.tokens?.fill !== token.name) shape.applyToken(token, ['fill']);
```

Pour REMPLACER un token différent déjà présent, l'opération n'est pas
garantie en un appel — vérifier en relecture et réappliquer si besoin.

**G4. Boards → `applyToSelected`, pas `applyToken`**
Sur un shape `type === 'board'`, `applyToken` et `applyToShapes` échouent
SILENCIEUSEMENT. Seule méthode fiable :

```js
penpot.selection = [shape];
token.applyToSelected(['fill']);   // prévoir un 2e appel pour lier réellement
```

**G5. Anti-doublon — chercher les permutations de segments avant CREATE**
Avant de créer `button.contained.primary.bg`, chercher AUSSI les
ré-ordonnancements : `button.contained.bg.primary`, etc. Un doublon à
segments permutés ne lève aucune erreur et oblige à migrer tous les shapes
ensuite. Réutiliser la nomenclature majoritaire déjà en place.

**G6. Strokes = appel séparé**
Les tokens de bordure s'appliquent via `shape.applyToken(token,
['strokeColor'])`, distinct du fill. Un audit/application de fill ne couvre
jamais les strokes.

**G7. Chunk = 10 max, page par ID**
- Max **10 shapes** par bloc `execute_code` (au-delà : timeout 30s).
- Naviguer par **ID de page** via `openPage(id)`, JAMAIS par nom.
  Re-vérifier `penpot.currentPage.name` après navigation.
- Après un timeout : NE PAS réappliquer aveuglément. Auditer d'abord ce qui
  est déjà lié (la passe a souvent réussi avant la coupure).

**B3 — Application** (voir `scripts/apply-tokens.js`)
⚠️ Gotchas :
- Appliquer uniquement des tokens `03-Composants` — jamais `02-Semantique`
  ni `01-Fondation` directement (voir règle section 0)
- Texte dans une instance non détachée = lié au master → `.detach()` d'abord
  (avec approbation, car c'est irréversible)
- `verticalSizing = 'auto'` ne redimensionne pas les parents → recalculer
  manuellement les hauteurs après application des tokens de sizing
- `penpot.selection = [shape]` à la fin pour montrer le résultat

**B4 — Vérification post-application**
Re-scanner le composant : toute valeur encore hardcodée sur une propriété
couverte par le set = ❌ à lister dans le rapport.

**B5 — CHECKPOINT — export_shape** du composant avant/après + rapport :
```
## Application — Accordion/No-details/Default
| Token | Propriété cible | Élément | Statut |
|-------|------------------|---------|--------|
| accordion.bg | fill | board racine | ✅ lié |
| accordion.text | fill | Typography × 2 | ✅ lié |
| accordion.icon | fill | Vector | ✅ lié |
| accordion.border | fill | divider-container | ✅ lié |
```

---

## 2bis. WORKFLOW C — BOOTSTRAP (librairie sans tokens)

> Mode pour librairie vierge. 3 étapes séquentielles avec 2 checkpoints
> bloquants — le niveau Semantique est qualifié par l'humain, jamais inféré.

### Brief Contract

- **Input** : sélection, ou TOUS les composants de la librairie locale
- **Output** : sets `01-Fondation`, `02-Semantique`, `03-Composants` créés et peuplés
- **Constraint** : aucune création avant que les 2 checkpoints soient
  validés — le script bloque explicitement si des rôles sont manquants
- **Acceptance** : chaîne complète `Fondation → Semantique → Composants`,
  zéro alias direct Fondation en composant

### Modèle recommandé : **Opus** (librairie inconnue) / Sonnet (librairie maîtrisée)

La qualification sémantique (étape 2) est la seule étape qui demande du
jugement sur une librairie inconnue. Sonnet suffit quand le designer
connaît la lib et peut qualifier rapidement.

---

### ÉTAPE 1 — SCAN (`STEP = 1`)

Passer `STEP = 1` dans `bootstrap-tokens.js`, exécuter.

L'agent extrait toutes les valeurs visuelles (couleurs, espacements, radius,
tailles, typographie), les déduplique et présente une **palette structurée**
avec le contexte d'usage de chaque valeur :
- sur quels composants
- dans quels états (`enabled`, `hovered`…)
- dans quelles propriétés (`bg`, `border-color`…)
- flag hors-grille 4px

⚠️ **Valeurs hors grille** : corriger dans le design AVANT de continuer.
Une fois figée en token, une valeur hors grille se propage.

**Output** : `PALETTE_JSON` à copier pour l'étape 2.

---

### CHECKPOINT 1 — Validation de la palette

Avant d'aller en étape 2 :
- Vérifier que toutes les valeurs attendues sont présentes
- Corriger les valeurs hors grille dans le design si nécessaire
- Confirmer les noms de tokens Fondation proposés

---

### ÉTAPE 2 — QUALIFICATION SÉMANTIQUE (`STEP = 2`)

Coller le `PALETTE_JSON` dans `STEP2_INPUT`, passer `STEP = 2`, exécuter.

L'agent présente **chaque valeur individuellement** avec son contexte
complet et demande son rôle sémantique. Aucune inférence automatique.

Pour chaque couleur :
```
[3] color.palette.252a31
     Valeur   : #252A31
     Usages   : 18× sur [accordion, card, sidebar, topbar]
     États    : enabled
     Props    : bg
     → semanticRole : [À REMPLIR]  ex: color.surface.panel
```

Rôles disponibles (exemples Astralan) :
```
color.surface.app       color.surface.panel
color.surface.card      color.surface.overlay
color.text.primary      color.text.secondary
color.text.muted        color.text.disabled
color.intent.primary    color.intent.danger
color.border.default    action.hover
IGNORE                  FONDATION_ONLY
```

Une valeur peut avoir **plusieurs rôles** — les séparer par `|`.

**Output** : `QUALIFICATION_JSON` édité (tous les `semanticRole` renseignés).

---

### CHECKPOINT 2 — Validation de la qualification

Le script bloque si un `semanticRole` est encore `null`. Avant de
continuer, vérifier :
- Chaque couleur a un rôle (ou `IGNORE` / `FONDATION_ONLY`)
- Les rôles sont cohérents entre eux
- Les noms Semantique respectent le namespace (`color.*`, `action.*`…)

---

### ÉTAPE 3 — GÉNÉRATION (`STEP = 3`)

Coller le `QUALIFICATION_JSON` validé dans `STEP3_INPUT`, passer `STEP = 3`.

Création batchée dans l'ordre `tokenSetOrder` en **un seul bloc** :

```
01-Fondation  → valeurs littérales
02-Semantique → 100% alias {fondationName}
03-Composants → alias {semantiqueRole}
```

Chaque set : `addSet()` + `toggleActive()` avant le premier `addToken()`.
Tout `addToken()` retournant `null` est loggué (duplicat silencieux).

**Après la génération** : tout token en alias direct Fondation (semantic
manquant) est flagué — relancer l'étape 2 pour les requalifier.

---

### Chaîne complète

```
Librairie vierge
   │
   ├─ ÉTAPE 1 : SCAN         → PALETTE_JSON
   ├─ CHECKPOINT 1           → valider la palette
   ├─ ÉTAPE 2 : QUALIFY      → QUALIFICATION_JSON (qualification humaine)
   ├─ CHECKPOINT 2           → valider les rôles Semantique
   ├─ ÉTAPE 3 : GENERATE     → 3 niveaux créés
   ├─ B. APPLY               → composants liés aux tokens
   └─ A. EXTRACT             → pour tout nouveau composant ensuite
```

---

## 3. Cas d'usage — série de composants

Pour une sélection multiple (ex. les 5 variants d'état d'un Accordion) :
1. Grouper par composant racine (nom avant le `/`)
2. EXTRACT : factoriser — les valeurs communes remontent en un seul token,
   les valeurs par état génèrent les suffixes `-hover/-disabled/…`
3. Détecter les incohérences : si `hovered` diffère entre deux variants du même
   composant → **flag** (probable erreur de design) plutôt que créer 2 tokens

---

## 4. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Cette couleur n'existe qu'ici, je la mets en littéral dans le composant." | Non. Chaîne complète Fondation → Semantique → Composants, ou rien. Checkpoint obligatoire. |
| "Je crée le token composant en alias direct vers la Fondation, c'est plus court." | Interdit. Un composant référence le Semantique, jamais la Fondation. |
| "Le meilleur token est dans 02-Semantique, je l'applique directement." | Interdit. Créer d'abord le token 03-Composants correspondant. |
| "Le set existe sûrement déjà, j'insère directement." | Vérifier. `addToken()` retourne null en silence sur duplicat. |
| "Je vais créer les sets dans un bloc et les tokens dans le suivant." | Non — un seul bloc execute_code, sinon les tokens retournent null. |
| "L'instance n'est pas détachée mais ça devrait marcher." | Le texte reste lié au master. `.detach()` approuvé d'abord. |
| "Les calques s'appellent Rectangle 12 mais je devine la structure." | Stop. `penpot-rename-layers` d'abord, sinon le binding est fragile. |

---

## 5. Fichiers du workflow

- `scripts/bootstrap-tokens.js` — génération 3 niveaux depuis librairie vierge
- `scripts/extract-tokens.js` — extraction + création batchée (structure existante)
- `scripts/apply-tokens.js` — binding tokens → propriétés
- `references/token-architecture-rule.md` — règle des 3 niveaux (référence complète)
- `references/tokens2026-architecture.md` — anatomie de la librairie de référence
- `references/apply-pitfalls.md` — pièges APPLY confirmés terrain (débogage)

## 6. Références

- `shared/plugin-api-gotchas.md`
- Librairie de référence : `tokens2026.json` (59 sets, ~1100 tokens)
- Format : Tokens Studio (`$themes`, `$metadata.tokenSetOrder`)