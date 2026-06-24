---
id: penpot-annotation
name: penpot-annotation
version: 0.1.0
mode: review
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Generate handoff annotations directly in Penpot: token names on fills/strokes,
  spacing labels, component names with variant state, missing-token flags.
  Produces a dedicated annotation layer without touching the design.
  Triggers on: "annote ce frame", "prépare le handoff", "ajoute les specs",
  "doc pour le dev", "annoter les tokens", "handoff".
---

# penpot-annotation — Handoff automatique

> Ce skill génère une **couche d'annotation** superposée au design —
> il ne modifie jamais les shapes originaux.
> Il valide en production que le pipeline tokens fonctionne :
> une propriété sans token → flag rouge visible dans l'annotation.

---

## 1. Purpose

Deux modes :

- **ANNOTATE** : génère les annotations de handoff sur un frame ou une sélection
  — noms de tokens, espacements, composants, flags de valeurs hardcodées.
- **CLEAN** : supprime la couche d'annotation (préserve le design sous-jacent).

---

## 2. Token-Aware Brief Contract

- **Context** : frame(s) ou sélection à annoter
- **Objective** : annotation complète ou ciblée (tokens seuls, spacing seul…)
- **Constraints** :
  - Toutes les annotations dans un board dédié `[Annotations]` — jamais
    dans les calques du design
  - Ne pas modifier les shapes originaux
  - Annotations en lecture seule pour le dev (pas de calques éditables)
- **Acceptance** :
  - Chaque propriété couverte par un token affiche le nom du token
  - Chaque valeur hardcodée affiche un flag `⚠️ hardcodé`
  - Les espacements sont annotés avec valeur px + token si disponible
  - Les composants affichent leur nom + variant actif

---

## 3. Preconditions

1. `high_level_overview` en premier.
2. Charger les tokens (`01-Fondation`, `02-Semantic`, `03-Component/**`).
3. Charger le manifest `penpot-library-mapper` si disponible (pour les noms
   de composants et variants).
4. Vérifier qu'un board `[Annotations]` n'existe pas déjà sur la page —
   si oui, proposer de le supprimer ou de le mettre à jour.

---

## 4. Phase ANNOTATE

### 4.1 — Analyse du scope

```javascript
// Scope : sélection ou frame courant
const scope = penpot.selection.length > 0
  ? penpot.selection
  : [penpot.currentPage.children.find(s => s.type === 'frame')];
```

### 4.2 — Création du board d'annotations

```javascript
// ⚠️ penpot.createBoard() — pas createFrame() (bug #6)
const annotBoard = penpot.createBoard();
annotBoard.name = '[Annotations]';
// Positionner à droite du frame source
annotBoard.x = sourceFrame.x + sourceFrame.width + 40;
annotBoard.y = sourceFrame.y;
annotBoard.fills = []; // transparent
```

### 4.3 — Résolution des tokens

Pour chaque propriété de chaque shape :
1. Chercher un token dont la valeur résolue correspond
2. Si trouvé → label vert avec le nom du token
3. Si non trouvé → label rouge `⚠️ hardcodé : [valeur]`

### 4.4 — Types d'annotations

#### Couleurs (fills + strokes)
```
[token] dark.primary.main          ← fond du composant
[token] dark.text.primary          ← label
[⚠️]   #e0e0e0 hardcodé            ← valeur sans token
```

#### Espacements (paddings, gaps)
```
↕ 8px  {dark.spacing.sm}          ← padding vertical tokenisé
→ 16px {dark.spacing.md}          ← padding horizontal
⟷ 12px ⚠️ hardcodé               ← gap sans token
```

#### Typographie
```
[T] Body1 · 16px/24px · Regular   ← si lié à un style
[T] 14px/20px · Medium ⚠️         ← si valeurs brutes
```

#### Composants et variants
```
[◈] Button/Outlined               ← nom du composant
    state=hovered · size=sm       ← variants actifs (depuis manifest)
    ↳ détaché ⚠️                  ← si instance détachée
```

#### Radius + border-width
```
[◉] radius: 4px {dark.radius.button}
[▢] border: 1px {dark.border.main}
```

### 4.5 — Lignes de cotation (espacements entre éléments)

Pour les espacements entre éléments frères dans un flex :
- Ligne horizontale ou verticale entre les éléments
- Label centré avec valeur px + token

### 4.6 — CHECKPOINT

Avant de créer le board d'annotations, afficher le résumé :
```
Frame : "Dashboard"
Shapes analysées : 47
  → 38 propriétés avec token
  → 9 propriétés hardcodées (⚠️)
  → 12 composants identifiés
  → 5 espacements annotables

Créer les annotations ? [oui / cibler un sous-ensemble]
```

---

## 5. Phase CLEAN

Supprimer le board `[Annotations]` de la page courante :

```javascript
const annot = penpot.currentPage.children
  .find(s => s.name === '[Annotations]');
if (annot) {
  penpot.currentPage.root.removeChild(annot);
  console.log('✅ Annotations supprimées.');
} else {
  console.log('ℹ️ Aucun board [Annotations] trouvé.');
}
```

---

## 6. Format des labels d'annotation

```
Couleur token   : [● token-name]               fond vert foncé, texte blanc
Couleur hardcode: [● #hex ⚠️]                  fond rouge, texte blanc
Spacing token   : [↕ 8px · token-name]         fond bleu foncé, texte blanc
Spacing hardcode: [↕ 13px ⚠️]                  fond orange, texte blanc
Composant       : [◈ Button/Outlined]           fond violet, texte blanc
Typo            : [T Body1 · 16/24]             fond gris foncé, texte blanc
```

Police des labels : monospace, 10px — pour ne pas interférer avec
la lisibilité du design annoté.

---

## 7. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Je vais annoter directement sur le design, c'est plus rapide." | Non — le board `[Annotations]` est isolé. Le dev bascule la visibilité, pas le designer. |
| "Il y a 9 valeurs hardcodées, je les ignore pour aller vite." | Les flags ⚠️ sont le point de valeur principal du handoff. Les omettre vide le skill de son utilité. |
| "Le manifest n'est pas chargé, je devine le nom du composant." | Sans manifest → annoter le nom de calque Penpot, pas un nom de composant inventé. |
| "Je modifie le shape original pour ajouter un tag." | Jamais. Toute annotation va dans `[Annotations]`. |

---

## 8. Fichiers du skill

- `scripts/annotate-frame.js` — génération complète du board d'annotation
- `scripts/clean-annotations.js` — suppression de la couche
- `references/annotation-style-guide.md` — couleurs et typographie des labels

## 9. Références

- `shared/plugin-api-gotchas.md` (bugs #6 createBoard, #7 library externe)
- Skills liés : `penpot-token-pipeline` (résolution tokens),
  `penpot-library-mapper` (manifest composants),
  `penpot-audit-tokens` (scoreGovernance pour le résumé ⚠️)
