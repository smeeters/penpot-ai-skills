# Règles QA — référence détaillée et seuils ajustables

## Profils de sévérité

| Profil | Usage | Effet |
|--------|-------|-------|
| `standard` | Itérations quotidiennes | Seuils tels que définis |
| `strict` | Publication en bibliothèque, handoff final | Tous les ⚠️ deviennent ❌ |

Changer dans `qa-audit.js` : `const PROFILE = 'strict'`.

## Seuils ajustables

| Constante | Défaut | Quand l'ajuster |
|-----------|--------|-----------------|
| `GRID` | 4 | Bibliothèque Carbon → garder 4 (mini-unit 8 mais demi-pas accepté) ; système strict 8px → 8 |
| `FAMILY_CAP` | 100 | Réduire à 50 pour lisser l'impact d'une famille très dégradée |
| Pénalités error/warning | 10 / 3 | Durcir error à 15 pour les fichiers de bibliothèque |
| Imbrication max (QA-3) | 6 | Monter à 8 pour les organismes complexes (tables, menus imbriqués) |
| Écart "incohérence" (QA-2) | ≤ 6px | Espacements proches mais différents = suspect ; au-delà = probablement intentionnel |

## Détail des règles ambiguës

### QA-1 — "couvert par un token"
Une valeur est couverte si un token (littéral en Fondation, ou alias résolu
depuis Semantic/Component) aboutit exactement à cette valeur. La comparaison
couleur est insensible à la casse. Les opacités font partie de la valeur :
`#fff@0.08` ≠ `#fff`.

### QA-2 — demi-pixels
Penpot peut produire des coordonnées fractionnaires après des opérations de
groupe/scale. Elles rendent flou à l'export raster. La règle ne s'applique
qu'aux shapes feuilles visibles (pas aux groupes englobants).

### QA-3 — noms génériques
Regex : `^(rectangle|ellipse|group|board|text|path|frame|image)\s*\d*$`.
Les noms métier contenant ces mots ne matchent pas (`text-field-container` ✅).

### QA-4 — instance détachée
Détection via `isComponentInstance()` + `isDetached()` — API variable selon
la version de Penpot, le contrôle est wrappé en try/catch et dégrade en
silence si indisponible (le rapport l'indique alors en ligne info).

### QA-5 — texte de démo
`lorem ipsum` n'importe où, ou contenu exactement égal à `text|label|title|button`.
Les vrais labels courts légitimes ("Titre" en français) ne matchent pas.

### QA-6 — échantillonnage
Ce skill ne fait que les deux contrôles les moins coûteux (target size,
heuristique de nom interactif). Le contraste complet, les états de focus et
les 6 critères WCAG 2.2 relèvent de `penpot-wcag22`.

## Exceptions documentées

Pour exempter un élément d'une règle (choix design assumé) :
1. Suffixer son nom de calque : `hero-image [qa-ignore:QA-2]`
2. L'audit liste les exemptions dans une section dédiée du rapport — une
   exemption non justifiée en revue humaine reste un finding.

(Le parsing `[qa-ignore:…]` est une convention à activer dans le script si
le besoin se confirme — non implémenté par défaut pour éviter l'abus.)
