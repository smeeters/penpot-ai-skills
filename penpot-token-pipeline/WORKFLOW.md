---
id: penpot-token-pipeline
name: penpot-token-pipeline
version: 0.1.0
mode: review
audiences: ["design-system", "design-engineer"]
description: >
  Bidirectional token workflow on a 3-level architecture
  (01-Fondation → 02-Semantic → 03-Component). BOOTSTRAP: generate the full
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

```
01-Fondation                      valeurs brutes uniquement
  color.vert.main: #66bb6a          jamais d'alias ici
  spacing.8: 8
  sizing.32: 32

02-Semantic                       100% aliases vers 01-Fondation
  dark.success.main: {color.vert.main}
  dark.action.hover: {color.…}
  dark.padding.button-sm.vertical: {spacing.…}

03-Component/Base/<Name>          états + structure, aliases vers 02-Semantic
  button.icon.color.error.hovered: {dark.error.main}
  button.container.border-radius: {dark.radius.button}

03-Component/<Size>/<Name>        UNIQUEMENT overrides de taille
  small.button.size.height: {dark.size.button.sm}
```

### Règles de chaînage strictes

| Niveau | Peut référencer | Ne peut JAMAIS référencer |
|--------|-----------------|---------------------------|
| 01-Fondation | rien (valeurs littérales) | tout alias |
| 02-Semantic | 01-Fondation | 03-Component, lui-même en cross-type |
| 03-Component/Base | 02-Semantic | 01-Fondation directement, autres composants |
| 03-Component/Size | 02-Semantic | 01-Fondation directement |

⚠️ **Gotcha Penpot** : les cross-références entre types différents
(color→opacity, etc.) ne sont pas supportées — alias intra-type uniquement,
littéraux sinon.

### Conventions de nommage (extraites de tokens2026.json)

```
Composant Base :  <component>.<élément>.<propriété>.<variant?>.<état>
                  button.icon.color.error.hovered
                  drawer-btn.container.bg.focused

Composant Size :  <size>.<component>.<propriété>
                  small.header-action-btn.size.height

Semantic :        dark.<groupe>.<sous-groupe>.<token>
                  dark.action.hover / dark.padding.button-sm.vertical

États canoniques : enabled | hovered | focused | pressed | disabled
Tailles :          sm | md | lg  (sets: Small | Medium | Large)
```

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
1. Existe-t-il un token **03-Component** du même composant avec cette valeur ? → réutiliser
2. Existe-t-il un token **02-Semantic** résolvant à cette valeur ? → créer le
   token composant en alias : `{dark.…}`
3. Existe-t-il un token **01-Fondation** avec cette valeur ? → proposer d'abord
   la création du semantic manquant, puis chaîner
4. Rien ne matche → **CHECKPOINT** : proposer la création Fondation + Semantic +
   Component (jamais créer une valeur orpheline directement en composant)

**A4 — Classement par niveau et par set**
- Propriétés d'état (couleurs hover/focus/disabled, etc.) → `03-Component/Base/<Name>`
- Propriétés dimensionnelles variant par taille → `03-Component/<Size>/<Name>`
- Le set cible suit la casse existante : `Base/Button`, `Small/Text-Field`…

**A5 — Création batchée** (voir `scripts/extract-tokens.js`)
⚠️ Gotchas API impératifs :
- `addSet()` PUIS `toggleActive()` AVANT tout `addToken()` (sinon null)
- Création de set + insertion des tokens dans **UN SEUL** bloc execute_code
- `addToken()` retourne silencieusement null sur nom dupliqué — vérifier
  l'existence avant, ne jamais compter sur l'écrasement

**A6 — CHECKPOINT — Rapport de mapping**
```
## Extraction — Button/Outlined
| Propriété | Valeur | Token créé/réutilisé | Niveau | Statut |
|-----------|--------|----------------------|--------|--------|
| fill (hover) | rgba(102,187,106,0.08) | {dark.action.hover} | reuse semantic | ✅ |
| border-radius | 4 | button.container.border-radius → {dark.radius.button} | new component | 🆕 |
| height | 36 | ⚠️ aucun match — proposer sizing.36 + dark.size.button.md | new chain | ❓ |
```
Attendre validation avant A5 si des créations Fondation/Semantic sont proposées.

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
- Si le composant s'appelle `Button` → chercher `03-Component/Base/Button` +
  le set de taille selon le thème actif (`NG-small` → `Small/Button`)
- Lister les thèmes actifs pour déterminer la résolution courante

**B2 — Construction de la table de binding**
Parcourir les tokens du set et matcher sur la structure du shape :
```
button.container.bg.hovered      → variant "hovered" → fill du container
button.icon.color.error.enabled  → variant "error"   → fill de l'icône
small.button.size.height         → height du board racine
```
Le matching élément se fait par nom de calque (`container`, `icon`, `label`) —
si les calques ne sont pas nommés sémantiquement, **STOP** : proposer d'abord
un passage de `penpot-rename-layers`.

**B3 — Application** (voir `scripts/apply-tokens.js`)
⚠️ Gotchas :
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
## Application — Button/Outlined (thème NG-small)
| Token | Propriété cible | Élément | Statut |
|-------|------------------|---------|--------|
| button.container.bg.hovered | fill | container (variant hovered) | ✅ lié |
| small.button.size.height | height | racine | ✅ 32px |
| button.label.color | fill | label | ❌ calque non trouvé |
```

---

## 2bis. WORKFLOW C — BOOTSTRAP (librairie sans tokens)

> Mode pour librairie vierge. 3 étapes séquentielles avec 2 checkpoints
> bloquants — le niveau Semantic est qualifié par l'humain, jamais inféré.

### Brief Contract

- **Input** : sélection, ou TOUS les composants de la librairie locale
- **Output** : sets `01-Fondation`, `02-Semantic`, `03-Component/**` créés et peuplés
- **Constraint** : aucune création avant que les 2 checkpoints soient
  validés — le script bloque explicitement si des rôles sont manquants
- **Acceptance** : chaîne complète `Fondation → Semantic → Component`,
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
[3] color.palette.66bb6a
     Valeur   : #66bb6a
     Usages   : 12× sur [button, chip, alert]
     États    : enabled, hovered
     Props    : bg, border-color
     → semanticRole : [À REMPLIR]
```

Rôles disponibles (exemples) :
```
dark.primary.main       dark.success.main
dark.secondary.main     dark.error.main
dark.background.default dark.text.primary
dark.action.hover       dark.divider
IGNORE                  FONDATION_ONLY
```

Une valeur peut avoir **plusieurs rôles** — les séparer par `|` :
`dark.text.disabled|dark.action.disabledBackground`

Les dimensionnels (espacements, tailles) ont un rôle auto-généré à
confirmer ou modifier. Les radius/border-width idem.

**Output** : `QUALIFICATION_JSON` édité (tous les `semanticRole` renseignés).

---

### CHECKPOINT 2 — Validation de la qualification

Le script bloque si un `semanticRole` est encore `null`. Avant de
continuer, vérifier :
- Chaque couleur a un rôle (ou `IGNORE` / `FONDATION_ONLY`)
- Les rôles sont cohérents entre eux (pas deux couleurs en `primary.main`)
- Les noms Semantic respectent le namespace (`dark.*`)

---

### ÉTAPE 3 — GÉNÉRATION (`STEP = 3`)

Coller le `QUALIFICATION_JSON` validé dans `STEP3_INPUT`, passer `STEP = 3`.

Création batchée dans l'ordre `tokenSetOrder` en **un seul bloc** :

```
01-Fondation  → valeurs littérales (couleur pure, pas d'opacité)
02-Semantic   → 100% alias {fondationName}, supporte les rôles multiples (|)
03-Component  → alias {semanticRole}, split Base/ (états) + Size/ (dimensions)
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
   ├─ CHECKPOINT 2           → valider les rôles Semantic
   ├─ ÉTAPE 3 : GENERATE     → 3 niveaux créés
   ├─ B. APPLY               → composants liés aux tokens
   └─ A. EXTRACT             → pour tout nouveau composant ensuite
```

---

## 3. Cas d'usage — série de composants

Pour une sélection multiple (ex. les 5 variants d'état d'un Button) :
1. Grouper par composant racine (nom avant le `/` ou variant master)
2. EXTRACT : factoriser — les valeurs communes remontent en un seul token,
   les valeurs par état génèrent les suffixes `.enabled/.hovered/…`
3. Détecter les incohérences : si `hovered` diffère entre deux variants du même
   composant → **flag** (probable erreur de design) plutôt que créer 2 tokens

---

## 4. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Cette couleur n'existe qu'ici, je la mets en littéral dans le composant." | Non. Chaîne complète Fondation → Semantic → Component, ou rien. Checkpoint obligatoire. |
| "Je crée le token composant en alias direct vers la Fondation, c'est plus court." | Interdit. Un composant référence le Semantic, jamais la Fondation. |
| "Le set existe sûrement déjà, j'insère directement." | Vérifier. `addToken()` retourne null en silence sur duplicat. |
| "Je vais créer les sets dans un bloc et les tokens dans le suivant." | Non — un seul bloc execute_code, sinon les tokens retournent null. |
| "L'instance n'est pas détachée mais ça devrait marcher." | Le texte reste lié au master. `.detach()` approuvé d'abord. |
| "Les calques s'appellent Rectangle 12 mais je devine la structure." | Stop. `penpot-rename-layers` d'abord, sinon le binding est fragile. |

---

## 5. Fichiers du workflow

- `scripts/bootstrap-tokens.js` — génération 3 niveaux depuis librairie vierge
- `scripts/extract-tokens.js` — extraction + création batchée (structure existante)
- `scripts/apply-tokens.js` — binding tokens → propriétés
- `references/tokens2026-architecture.md` — anatomie de la librairie de référence

## 6. Références

- `shared/plugin-api-gotchas.md`
- Librairie de référence : `tokens2026.json` (59 sets, ~1100 tokens)
- Format : Tokens Studio (`$themes`, `$metadata.tokenSetOrder`)
