# Règles de reflow — penpot-responsive-variants

## Principes fondamentaux

1. **Le desktop est la source de vérité** — les variantes sont des transformations, pas des recréations.
2. **Pas de compression** — redimensionner sans reflow ≠ responsive. Le contenu se réorganise.
3. **Grille 4px** — tous les espacements résultants doivent être des multiples de 4px.
4. **Zéro valeur introduite** — les nouvelles valeurs viennent des tokens `Small/` et `Medium/` ou du calcul proportionnel.

---

## Facteurs de transformation

| Propriété | Mobile (375/1280) | Tablet (768/1280) |
|-----------|------------------|------------------|
| Padding | ×0.50 (arrondi 4px) | ×0.75 (arrondi 4px) |
| Gap | ×0.67 (arrondi 4px) | ×0.67 (arrondi 4px) |
| Font size | ×0.85 (arrondi 2px) | ×0.92 (arrondi 2px) |
| Border radius | inchangé | inchangé |
| Border width | inchangé | inchangé |

---

## Transformations flex

| Layout source | Mobile | Tablet |
|---------------|--------|--------|
| `flex-direction: row` | → `column` | → `row` (inchangé) |
| `flex-direction: row-reverse` | → `column-reverse` | → `row-reverse` |
| `flex-direction: column` | inchangé | inchangé |
| `align-items: flex-end` (row) | → `flex-start` (column) | inchangé |

---

## Navigation — règles de transformation

### Sidebar / Drawer
```
Desktop : sidebar 240px fixe, contenu flex-grow
Mobile  : sidebar masquée + bottom navigation 56px en bas du board
Tablet  : sidebar masquée + burger icon dans la top nav
```
**Implémentation** : créer un placeholder `[Bottom Nav]` à remplacer
par le composant de bibliothèque correspondant.

### Top navigation
```
Desktop : nav complète avec liens texte + search + avatar
Mobile  : nav compacte (logo + burger) height 56px
Tablet  : nav standard height 64px
```

### Tabs
```
Desktop : tab bar horizontale complète
Mobile  : tab bar scrollable (overflow-x auto)
Tablet  : inchangée
```

---

## Grille de colonnes

### Desktop 1280px (12 colonnes)
```
margin: 32px | col1 | 24px | col2 | 24px | ... | col12 | 32px
col-width ≈ 80px
```

### Tablet 768px (8 colonnes)
```
margin: 24px | col1 | 16px | col2 | ... | col8 | 24px
col-width ≈ 72px
```

### Mobile 375px (4 colonnes)
```
margin: 16px | col1 | 16px | col2 | 16px | col3 | 16px | col4 | 16px
col-width ≈ 63px
```

**Correspondance** :
| Desktop | Tablet | Mobile |
|---------|--------|--------|
| 12 col | 8 col | 4 col |
| 6 col | 4 col | 4 col |
| 4 col | 4 col | 4 col |
| 3 col | 2 col | 4 col |

---

## Typographie

| Style | Desktop | Tablet | Mobile |
|-------|---------|--------|--------|
| Display | 60px | 48px | 36px |
| H1 | 48px | 40px | 32px |
| H2 | 36px | 30px | 24px |
| H3 | 28px | 24px | 20px |
| H4 | 22px | 20px | 18px |
| H5 | 18px | 16px | 16px |
| H6 | 16px | 14px | 14px |
| Body1 | 16px | 16px | 14px |
| Body2 | 14px | 14px | 12px |
| Caption | 12px | 12px | 12px |
| Overline | 12px | 12px | 10px |

---

## Composants — switchVariant de taille

Si le manifest `penpot-library-mapper` est disponible :

| Composant | Desktop | Mobile | Axe variant |
|-----------|---------|--------|-------------|
| Button | Medium / Large | Small | size |
| TextField | Medium | Small | size |
| Chip | Medium | Small | size |
| Avatar | Medium / Large | Small | size |
| Icon | 24px | 20px | size |

---

## Éléments à masquer sur mobile

Ajouter `opacity: 0` ou renommer avec le suffixe `[hidden-mobile]` :
- Colonnes de tableau secondaires (> 3)
- Illustrations décoratives latérales
- Labels de navigation (garder les icônes)
- Sidebar complète (remplacée par bottom nav)
- Breadcrumb complet (garder seulement ← parent)
- Actions tertiaires dans les barres d'outils

---

## Cas particuliers

### Column-reverse
```javascript
// ⚠️ column-reverse inverse les paddings
const rev = /reverse/.test(flex.dir);
const paddingTop = rev ? flex.paddingBottom : flex.paddingTop;
```

### verticalSizing auto (bug #8520)
Toujours recalculer la hauteur du board après transformation :
```javascript
const h = kids.reduce((m,k) => Math.max(m, k.y + k.height), 0);
board.resize(board.width, h + paddingBottom + 16);
```
