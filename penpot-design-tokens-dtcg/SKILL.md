---
id: penpot-design-tokens-dtcg
name: penpot-design-tokens-dtcg
version: 0.1.0
mode: review
audiences: ["design-engineer", "design-system"]
description: >
  Consolidate the multi-file Tokens Studio export from Penpot into a single
  DTCG JSON, then transform to CSS custom properties and JS/TS tokens via
  Style Dictionary. Target: Storybook consumption.
  Triggers on: "exporter les tokens", "générer le CSS", "build tokens",
  "mettre à jour Storybook", "pipeline tokens", "design tokens dtcg".
---

# penpot-design-tokens-dtcg — Export tokens → Storybook

> Pipeline unidirectionnel : Penpot → tokens.json → CSS + JS → Storybook.
> Déclenché manuellement à chaque release de design.

---

## 1. Architecture de l'export

```
tokens-export/                    ← export Tokens Studio depuis Penpot
├── $metadata.json                ← tokenSetOrder + activeSets
├── $themes.json                  ← 29 thèmes (2 de résolution actifs)
├── 01-Fondation.json             ← 245 tokens (valeurs littérales)
├── 02-Semantic.json              ← 274 tokens (aliases vers Fondation)
└── 03-Component/
    ├── Base/<composant>.json     ← états (aliases vers Semantic)
    ├── Small/<composant>.json    ← overrides dimensionnels
    ├── Medium/<composant>.json
    ├── Large/<composant>.json
    └── <composant-singulier>.json

Total : 57 fichiers · 1119 tokens · 29 thèmes
```

### Particularités découvertes à l'analyse

**Format** : Tokens Studio (`$value`/`$type`) — compatible DTCG directement.

**Alias cross-fichiers** : les composants référencent `{dark.*}` (Semantic),
le Semantic référence `{color.*}`, `{spacing.*}`, etc. (Fondation).
Style Dictionary résout la chaîne automatiquement via merge.

**01-Fondation contient 29 alias** : ce sont les tokens `typography` dont
`$value` est un objet composite (fontFamily, fontSize, etc.) — pas de vraie
circularité, mais à traiter séparément (voir §4).

**Thèmes actifs** : seuls `NG-small` et `NG-Medium` ont des sets enabled (30 et 26).
Les 27 autres thèmes (par composant) sont vides — à ignorer dans l'export.

---

## 2. Pipeline

```
STEP 1 — CONSOLIDATE (consolidate.js)
  57 fichiers JSON → 1 fichier merged selon tokenSetOrder
  Résolution du namespace : chaque fichier devient un nœud racine

STEP 2 — BUILD (npm run build:tokens)
  Style Dictionary v4 + sd-transforms de Tokens Studio
  → dist/tokens.css     (CSS Custom Properties)
  → dist/tokens.js      (ES Module)
  → dist/tokens.d.ts    (TypeScript declarations)

STEP 3 — CONSUME (Storybook)
  import tokens from './dist/tokens.js'
  import './dist/tokens.css'
```

---

## 3. Script de consolidation (STEP 1)

Voir `scripts/consolidate.js`.

Logique :
1. Lire `$metadata.json` → ordre des sets (`tokenSetOrder`)
2. Pour chaque set, lire le fichier JSON correspondant
3. Merger dans un objet unique en respectant l'ordre (les overrides Size
   écrasent les valeurs Base pour les mêmes clés)
4. Écrire `tokens/tokens.json`

Particularité typographie : les tokens `typography` dont `$value` est un
objet composite sont éclatés en sous-tokens individuels pour Style Dictionary
(`fontFamily`, `fontSize`, `fontWeight`, etc.).

---

## 4. Config Style Dictionary (STEP 2)

Voir `config/style-dictionary.config.js`.

Transforms appliqués (via `sd-transforms`) :
- `ts/resolveMath` — résout les expressions mathématiques dans les valeurs
- `ts/size/px` — ajoute `px` aux valeurs numériques de dimension
- `ts/color/modifiers` — gère les modificateurs de couleur (overlays)
- `ts/typography/compose` — compose les tokens typography en shorthand

Formats de sortie :
- `css/variables` → `--{token-path}: {value}`
- `javascript/esm` → `export const tokens = {...}`
- `typescript/module-declarations` → `export declare const tokens`

---

## 5. Ce que Storybook consomme

### CSS Custom Properties (`dist/tokens.css`)

```css
:root {
  /* 01-Fondation */
  --color-vert-main: #66bb6a;
  --spacing-8: 8px;

  /* 02-Semantic */
  --dark-primary-main: var(--color-vert-main);
  --dark-action-hover: rgba(255,255,255,0.08);
  --dark-text-primary: rgba(255,255,255,0.87);

  /* 03-Component (résolution NG-small par défaut) */
  --button-size-height: 28px;
  --button-container-border-radius: 4px;
  --button-icon-color-enabled: var(--dark-text-primary);
}
```

### ES Module (`dist/tokens.js`)

```javascript
export const tokens = {
  color: { vert: { main: '#66bb6a' } },
  dark: {
    primary: { main: '#66bb6a' },
    action:  { hover: 'rgba(255,255,255,0.08)' },
    text:    { primary: 'rgba(255,255,255,0.87)' },
  },
  button: {
    size:      { height: '28px' },
    container: { borderRadius: '4px' },
    icon:      { color: { enabled: 'rgba(255,255,255,0.87)' } },
  }
}
```

### Intégration Storybook

```javascript
// .storybook/preview.js
import '../dist/tokens.css';

// Pour les contrôles Storybook
import { tokens } from '../dist/tokens.js';
export const parameters = {
  designToken: { files: ['../dist/tokens.css'] }
};
```

---

## 6. Gestion des thèmes (résolutions Small/Medium/Large)

L'export contient 3 résolutions (Small, Medium, Large) pour les tokens
dimensionnels des composants. Storybook peut switcher entre elles.

**Stratégie recommandée** : générer 3 fichiers CSS, un par résolution :

```
dist/
├── tokens.css              ← base (Fondation + Semantic)
├── tokens.small.css        ← surcharge Small/
├── tokens.medium.css       ← surcharge Medium/
└── tokens.large.css        ← surcharge Large/
```

```javascript
// Storybook — switcher de résolution
import '../dist/tokens.css';
import '../dist/tokens.small.css'; // résolution active
```

---

## 7. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Je copie-colle manuellement les valeurs dans le CSS." | Le pipeline génère 1119 tokens automatiquement. Le manuel introduit des erreurs et ne passe pas à l'échelle. |
| "Je ne génère que la Fondation, le Semantic c'est redondant." | Storybook a besoin des tokens sémantiques pour les composants — pas des valeurs primitives brutes. |
| "Je déclenche le build à chaque save." | Build déclenché manuellement à chaque release design. Pas à chaque modification. |
| "Les typography composites bloquent Style Dictionary." | Elles sont éclatées en sous-tokens dans `consolidate.js`. Testé. |

---

## 8. Fichiers du skill

- `scripts/consolidate.js` — merge 57 fichiers → `tokens/tokens.json`
- `config/style-dictionary.config.js` — config SD v4 avec sd-transforms
- `config/package.json` — dépendances npm (sd v4, sd-transforms)
- `references/export-analysis.md` — analyse de la structure d'export

## 9. Références

- Style Dictionary v4 : https://styledictionary.com
- sd-transforms : https://github.com/tokens-studio/sd-transforms
- Context7 : `styledictionary.com`, `tokens-studio/sd-transforms`
