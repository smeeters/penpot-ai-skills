# Intégration Storybook — Design Tokens

## Structure des fichiers générés

```
dist/
├── tokens.css              ← Fondation + Semantic (variables CSS)
├── tokens.components.css   ← Composants Base
├── tokens.small.css        ← Résolution Small  (data-size="small")
├── tokens.medium.css       ← Résolution Medium
├── tokens.large.css        ← Résolution Large
├── tokens.js               ← ES Module (valeurs résolues)
└── tokens.d.ts             ← TypeScript declarations
```

---

## 1. Import de base dans Storybook

```javascript
// .storybook/preview.js
import '../dist/tokens.css';
import '../dist/tokens.components.css';
import '../dist/tokens.small.css'; // résolution par défaut
```

---

## 2. Switcher de résolution (Small / Medium / Large)

```javascript
// .storybook/preview.js
export const globalTypes = {
  tokenSize: {
    name: 'Token Size',
    defaultValue: 'small',
    toolbar: {
      icon: 'ruler',
      items: ['small', 'medium', 'large'],
    },
  },
};

export const decorators = [
  (Story, context) => {
    const size = context.globals.tokenSize ?? 'small';
    document.documentElement.setAttribute('data-size', size);
    return <Story />;
  },
];
```

---

## 3. Utilisation dans les composants

### Via CSS Custom Properties

```css
/* Composant Button */
.button {
  height: var(--button-size-height);
  border-radius: var(--button-container-border-radius);
  background-color: var(--dark-primary-main);
  color: var(--dark-primary-contrast-text);
}

.button:hover {
  background-color: var(--button-container-bg-hovered);
}
```

### Via l'objet JS

```typescript
// tokens.ts
import { tokens } from '../dist/tokens.js';

export const theme = {
  colors: {
    primary: tokens.dark.primary.main,
    error:   tokens.dark.error.main,
  },
  spacing: {
    sm: tokens.dark.gap.sm,
    md: tokens.dark.gap.md,
  },
};
```

### Via des variables SCSS

```scss
// Importer les tokens comme variables SCSS
@use '../dist/tokens.css';

.button {
  height: var(--button-size-height);
  padding: var(--button-padding-horizontal) var(--button-padding-vertical);
}
```

---

## 4. Exemples de tokens disponibles

### Couleurs sémantiques
```
--dark-primary-main            → #1976d2
--dark-primary-light           → #42a5f5
--dark-primary-dark            → #1565c0
--dark-error-main              → #f44336
--dark-success-main            → #66bb6a
--dark-text-primary            → rgba(255,255,255,0.87)
--dark-text-secondary          → rgba(255,255,255,0.6)
--dark-background-default      → #121212
--dark-background-paper        → #1e1e1e
--dark-action-hover            → rgba(255,255,255,0.08)
--dark-action-disabled         → rgba(255,255,255,0.3)
```

### Composants (résolution Small)
```
--button-size-height            → 28px
--button-container-border-radius→ 4px
--button-icon-color-enabled     → var(--dark-text-primary)
--button-container-bg-hovered   → var(--dark-action-hover)
--text-field-size-height        → 40px
--chip-size-height              → 24px
```

---

## 5. Workflow de mise à jour

```bash
# 1. Exporter depuis Penpot → Tokens Studio
#    Menu Plugins > Tokens Studio > Export > Save to disk

# 2. Remplacer le dossier d'export
cp -r ~/Downloads/tokens-export/* ./tokens-export/

# 3. Regénérer
npm run tokens

# 4. Committer
git add dist/ && git commit -m "chore: update design tokens"

# 5. Storybook prend automatiquement les nouveaux fichiers dist/
```

---

## 6. Résolution des thèmes par composant

Les 27 thèmes vides (Button/Small, Button/Medium, etc.) dans `$themes.json`
sont des thèmes de switch inter-composants — non exportés dans le pipeline
standard. Si nécessaire pour Storybook :

```javascript
// Générer des CSS séparés par composant+taille
// → Modifier style-dictionary.config.js pour ajouter des platforms
// → Un fichier CSS par combinaison (button.small.css, chip.medium.css, etc.)
```

Recommandation : utiliser `data-size` global (§2) plutôt que des fichiers
par composant — plus simple à maintenir.
