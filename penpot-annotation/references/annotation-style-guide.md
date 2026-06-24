# Guide de style des annotations

## Palette des labels

| Type | Fond | Usage |
|------|------|-------|
| `#1a4731` vert foncé | Propriété tokenisée | fill, stroke, radius, spacing liés à un token |
| `#7f1d1d` rouge foncé | Valeur hardcodée | toute valeur sans token correspondant |
| `#1e3a5f` bleu foncé | Espacement tokenisé | padding, gap liés à un token |
| `#7c2d12` orange foncé | Espacement hardcodé | padding, gap sans token |
| `#3b0764` violet | Composant | instances de bibliothèque |
| `#1c1917` gris foncé | Typographie | texte, taille, graisse |
| `#ffffff` blanc | Texte des labels | sur tous les fonds |

## Format des labels

```
● [nom-calque] fill → dark.primary.main       ← couleur tokenisée
● [nom-calque] fill ⚠️ #e0e0e0                ← couleur hardcodée
◉ [nom-calque] radius → dark.radius.button    ← radius tokenisé
↕ [nom-calque] padding-v 8px → dark.spacing.sm ← espacement tokenisé
↕ [nom-calque] gap ⚠️ 13px                    ← espacement hors grille
T [nom-calque] · 16px/24 400                  ← typographie
◈ [nom-calque]                                ← composant de bibliothèque
◈ [nom-calque] ↳ détaché ⚠️                   ← instance détachée
```

## Typographie des labels

- Police : Roboto Mono (monospace pour l'alignement)
- Taille : 10px
- Hauteur de label : 20px
- Padding interne : 6px gauche, 4px haut
- Border radius : 3px

## Board [Annotations]

- Positionné à 40px à droite du frame annoté
- Fond : `#f8f9fa` (gris très clair)
- Largeur : 400px fixe
- Hauteur : calculée dynamiquement
- Nom exact : `[Annotations]` (les crochets permettent de le repérer visuellement
  dans le panneau calques et de le masquer d'un clic)

## Convention de nommage des calques d'annotation

```
_annot_[texte-tronqué]    ← boards de labels (préfixe _annot_ → filtrables)
_annot_label              ← textes des labels
_annot_section            ← séparateurs de section
```

Le préfixe `_annot_` permet de les identifier et de les exclure
des audits QA (qa-audit.js les ignore si le board parent est `[Annotations]`).
