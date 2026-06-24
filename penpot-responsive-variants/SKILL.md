---
id: penpot-responsive-variants
name: penpot-responsive-variants
version: 0.1.0
mode: review
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Generate mobile (375px) and tablet (768px) variants from a desktop frame.
  Applies reflow rules: column stacking, Drawer→bottom nav, 12→4 grid columns,
  fluid typography. Uses only existing library components and tokens.
  Triggers on: "décline en mobile", "version responsive", "adapte pour mobile",
  "génère les breakpoints", "responsive variants", "version tablette".
---

# penpot-responsive-variants — Déclinaisons responsive

> 3 écrans pour le prix d'un.
> Le frame desktop est la source de vérité — les variantes mobile et tablet
> sont générées par transformation, pas recréées de zéro.

---

## 1. Purpose

Depuis un frame desktop existant, générer automatiquement :
- **Mobile** (375px) — reflow complet, navigation transformée
- **Tablet** (768px) — adaptation intermédiaire, grille réduite

Les variantes sont indépendantes (boards séparés) mais leur structure
reste liée à la source par convention de nommage.

---

## 2. Token-Aware Brief Contract

- **Input** : frame desktop sélectionné (1 seul à la fois)
- **Output** : 2 nouveaux boards `[Mobile] NomFrame` et `[Tablet] NomFrame`
  positionnés à droite du frame source
- **Constraints** :
  - Composants : switchVariant pour les tailles si disponible dans le manifest
  - Tokens dimensionnels : lire depuis `03-Component/Small/` et `Medium/`
  - Aucune valeur hardcodée introduite
  - Recalcul manuel de la hauteur parent (bug #8520 verticalSizing)
- **Acceptance** :
  - Aucun overflow horizontal sur mobile (tout dans 375px)
  - Grille alignée sur 4px
  - Passe `penpot-qa-checklist` ≥ 80/100

---

## 3. Preconditions

1. `high_level_overview` en premier.
2. Sélectionner exactement 1 frame desktop (largeur > 900px recommandée).
3. Charger les tokens — en particulier les sets `Small/` et `Medium/`.
4. Manifest `penpot-library-mapper` pour les switchVariant de taille.

---

## 4. Règles de reflow

### 4.1 — Grille

| Source (desktop) | Mobile | Tablet |
|-----------------|--------|--------|
| 12 colonnes | 4 colonnes | 8 colonnes |
| gutter 24px | gutter 16px | gutter 16px |
| margin 32px | margin 16px | margin 24px |
| largeur 1280px | largeur 375px | largeur 768px |

### 4.2 — Navigation

| Pattern desktop | Mobile | Tablet |
|----------------|--------|--------|
| Drawer latéral (Sidebar) | Bottom navigation (5 items max) | Drawer masqué + burger |
| Top navigation bar | Top nav compact | Top nav standard |
| Tab bar horizontale | Tab bar scrollable | Tab bar standard |
| Breadcrumb complet | Breadcrumb tronqué (1 niveau) | Breadcrumb complet |

### 4.3 — Layout des composants

| Pattern desktop | Mobile | Tablet |
|----------------|--------|--------|
| Flex row → plusieurs colonnes | Flex column → 1 colonne | Flex row → 2 colonnes |
| Card grid 3-4 colonnes | Card grid 1 colonne | Card grid 2 colonnes |
| Formulaire 2 colonnes | Formulaire 1 colonne | Formulaire 1-2 colonnes |
| Table complète | Table simplifiée (3 cols max) | Table standard |
| Dialog large | Bottom sheet | Dialog medium |
| Padding 32px | Padding 16px | Padding 24px |
| Gap 24px | Gap 16px | Gap 16px |

### 4.4 — Typographie fluide

| Rôle | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| h1 | 48px | 40px | 32px |
| h2 | 36px | 30px | 24px |
| h3 | 28px | 24px | 20px |
| body | 16px | 16px | 14px |
| caption | 12px | 12px | 12px |

Appliquer via les tokens `dark.typography.*` si disponibles —
sinon ajuster `fontSize` directement.

### 4.5 — Éléments à masquer / adapter

| Élément | Mobile | Tablet |
|---------|--------|--------|
| Labels de navigation (texte) | Masqués (icône seule) | Visibles |
| Colonnes de tableau secondaires | Masquées | Visibles |
| Sidebar de détail | Accordéon repliable | Visible |
| Actions secondaires | Menu overflow (…) | Visibles |
| Illustrations décoratives | Masquées | Réduites |

---

## 5. Étapes d'exécution

### 5.1 — Analyse du frame source

```javascript
// Inventaire des patterns présents dans le frame desktop
function analyzeFrame(frame) {
  const patterns = {
    hasSidebar:    false,
    hasTopNav:     false,
    hasTabs:       false,
    hasGrid:       false,
    hasTable:      false,
    hasDialog:     false,
    columns:       [],  // boards flex-row détectés
    typography:    [],  // éléments texte avec leur rôle
  };
  // Détecter par nom de calque et type de layout
  (function scan(shape) {
    const n = (shape.name ?? '').toLowerCase();
    if (/sidebar|drawer|side-nav|sidenav/.test(n)) patterns.hasSidebar = true;
    if (/top-nav|navbar|header|appbar/.test(n))    patterns.hasTopNav  = true;
    if (/tab|tabs/.test(n))                        patterns.hasTabs    = true;
    if (/table|data-grid|datagrid/.test(n))        patterns.hasTable   = true;
    if (shape.flex?.dir === 'row' &&
        (shape.children ?? []).length >= 2)        patterns.columns.push(shape.name);
    (shape.children ?? []).forEach(scan);
  })(frame);
  return patterns;
}
```

### 5.2 — CHECKPOINT — Plan de transformation

Avant création, présenter le plan :

```
Frame source : "Dashboard" (1280×900px)
Patterns détectés :
  ✅ Sidebar latérale → Bottom navigation (mobile) / Burger (tablet)
  ✅ Grid 3 colonnes → 1 colonne (mobile) / 2 colonnes (tablet)
  ✅ Table de données → 3 colonnes visibles (mobile)
  ✅ Padding 32px → 16px (mobile) / 24px (tablet)
  ✅ Typography h2 36px → 24px (mobile)

Composants à resizer via switchVariant :
  Button md → sm (mobile)
  TextField md → sm (mobile)

Créer [Mobile] Dashboard (375px) et [Tablet] Dashboard (768px) ?
```

### 5.3 — Duplication et transformation

```javascript
// ⚠️ Pas de deep clone natif — reconstruire structure par structure
// ou dupliquer via copie des propriétés shape par shape

function createVariant(sourceFrame, targetWidth, breakpoint) {
  // ⚠️ createBoard() pas createFrame() (bug #6)
  const variant = penpot.createBoard();
  variant.name  = `[${breakpoint}] ${sourceFrame.name}`;
  variant.x     = sourceFrame.x + sourceFrame.width + (breakpoint === 'Mobile' ? 40 : 455);
  variant.y     = sourceFrame.y;
  variant.resize(targetWidth, sourceFrame.height);
  variant.fills = sourceFrame.fills;
  // ⚠️ page.root.appendChild() (bug session 1)
  penpot.currentPage.root.appendChild(variant);
  return variant;
}
```

### 5.4 — Application des règles de reflow

Pour chaque shape du frame source, cloner et transformer selon le breakpoint :
- Flex row → column si `breakpoint === 'Mobile'`
- Paddings : appliquer le ratio de réduction
- Gaps : appliquer le ratio de réduction
- Typographie : appliquer la table §4.4
- Navigation : remplacer selon la table §4.2

### 5.5 — Recalcul des hauteurs (bug #8520)

```javascript
// ⚠️ verticalSizing auto ne propage pas — recalcul systématique
function recalcHeight(board) {
  const kids = board.children ?? [];
  if (kids.length === 0) return;
  const bottom = kids.reduce((m, k) => Math.max(m, (k.y ?? 0) + (k.height ?? 0)), 0);
  const top    = kids.reduce((m, k) => Math.min(m, (k.y ?? 0)), Infinity);
  const pad    = (board.flex?.paddingTop ?? 0) + (board.flex?.paddingBottom ?? 0);
  board.resize(board.width, bottom - top + pad + 24);
}
```

---

## 6. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Le mobile ressemble assez au desktop, je garde le même layout." | Les règles §4 s'appliquent systématiquement. Un flex-row desktop → flex-column mobile sans exception. |
| "Je copie le frame et je redimensionne, c'est plus rapide." | Redimensionner sans reflow produit du contenu coupé. Le skill transforme, pas compresse. |
| "La sidebar sur mobile n'a pas d'équivalent dans le manifest." | Bottom navigation ou top nav burger. Documenter le manque dans le rapport — ne pas laisser la sidebar telle quelle. |
| "J'ajuste la typo à l'œil." | Table §4.4 ou tokens `dark.typography.*` — jamais à l'estimation. |
| "La hauteur du board a l'air correcte." | Recalcul Manuel obligatoire (bug #8520). "A l'air" n'est pas suffisant. |

---

## 7. Fichiers du skill

- `scripts/generate-variants.js` — génération mobile + tablet depuis source desktop
- `references/reflow-rules.md` — règles de transformation détaillées
- `references/breakpoint-tokens.md` — mapping tokens par breakpoint

## 8. Références

- `shared/plugin-api-gotchas.md` (bugs #6, #8520, session 1)
- Skills liés : `penpot-token-pipeline` (tokens Small/Medium),
  `penpot-library-mapper` (switchVariant taille),
  `penpot-qa-checklist` (validation post-génération)
