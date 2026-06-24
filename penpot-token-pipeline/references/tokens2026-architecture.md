# Anatomie de la librairie de référence — tokens2026.json

> Analyse structurelle servant de contrat au workflow `penpot-token-pipeline`.
> Format : Tokens Studio (`$themes`, `$metadata.tokenSetOrder`).

## Vue d'ensemble

| Niveau | Sets | Tokens | Rôle |
|--------|------|--------|------|
| `01-Fondation` | 1 | 245 | Valeurs brutes — aucun alias |
| `02-Semantic` | 1 | 274 | 100% alias vers Fondation, namespace `dark.*` |
| `03-Component/**` | 55 | ~600 | Alias vers Semantic, par composant × résolution |
| `$themes` | — | — | Combinaisons de sets par résolution |

## 01-Fondation — répartition des types

```
color: 102        typography: 29     sizing: 34
spacing: 20       dimension: 16      number: 12
opacity: 10       borderRadius: 9    shadow: 8
borderWidth: 4    fontFamilies: 1
```

Groupes notables : `color.vert.*` (success), shades en pourcentages d'overlay
(`190p-overlay`, `160p-base`, `12p`, `8p`…), styles typo complets (`h2`, `h3`,
`body1`, `subtitle2`, `overline`, `helper-text`), groupes par usage
(`table`, `chip`, `menu`, `alert`, `tooltip`, `avatar`, `input`).

## 02-Semantic — namespace `dark.*`

23 groupes sémantiques :
```
primary  secondary  success  warning  error  info        ← palettes d'intention
text  background  action  divider  border  icon          ← rôles UI
spacing  gap  padding  size  radius                      ← dimensionnel
typography  opacity  motion  breakpoint  tooltip  other  ← divers
```

Pattern d'alias canonique :
```json
"dark.success.main":   { "$value": "{color.vert.main}",   "$type": "color" }
"dark.action.hover":   { "$value": "{color...}",          "$type": "color" }
"dark.padding.button-sm.vertical": { "$value": "{spacing...}", "$type": "spacing" }
```

## 03-Component — double découpage

### `Base/<Name>` — états et structure (le gros du composant)
Exemple `Base/Button` (~127 tokens) :
```
button.icon.color.<variant>.<état>
  variants : (défaut) | inherit | error | …
  états    : enabled | hovered | focused | pressed | disabled
button.container.bg.<état>
button.container.border-radius
```
→ Tous les alias pointent vers `02-Semantic` (`{dark.error.main}`,
`{dark.action.disabled}`…)

### `<Size>/<Name>` — overrides dimensionnels uniquement (~6-7 tokens)
Exemple `Small/Button` :
```
small.button.size.height        → {dark.size.button.sm}
small.button.padding.vertical   → {dark.padding.button-sm.vertical}
```

### Sets singuliers (sans découpage par taille)
`Dialog`, `Snackbar`, `Menu`, `Menu-Organism`, `Tab`, `Link`, `Tooltip`,
`Multiline` — composants à résolution unique.

## $themes — activation par résolution

| Thème | Groupe | Sets activés |
|-------|--------|--------------|
| `NG-small` | Resolution | 30 (Fondation + Semantic + tous les `Base/` + tous les `Small/`) |
| `NG-Medium` | Resolution | 26 (idem avec `Medium/`) |
| `Small/Medium/Large` | par composant (Button, Checkbox…) | 0 — groupes de switching fins |

**Implication workflow** : la résolution active détermine quel set `<Size>/`
cibler. `NG-small` actif → les tokens dimensionnels vont dans `Small/<Name>`.

## $metadata.tokenSetOrder

L'ordre de chargement est significatif : `01-Fondation` → `02-Semantic` →
`03-Component/Base/*` → tailles. Toute création de set doit respecter
cette position (les `Base/` avant les `Small|Medium|Large/`).

## Conventions extraites

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Nom de set composant | PascalCase-avec-tirets | `Base/Header-Action-Button` |
| Nom de token | kebab-case, hiérarchie par points | `button.container.border-radius` |
| Préfixe taille | minuscule | `small.header-action-btn.size.height` |
| États | 5 canoniques | `enabled hovered focused pressed disabled` |
| Valeur transparente | littéral `"transparent"` | `drawer-btn.container.bg.default` |

## ⚠️ Particularités à respecter

1. `bg.default` coexiste avec les états explicites (`bg.hovered`…) — `default`
   est utilisé à la place d'`enabled` dans certains composants (Drawer-Header-Button).
   Le workflow doit matcher les deux.
2. Certains sets de taille n'overrident que `height` + `item-width` — ne pas
   générer de tokens dimensionnels superflus.
3. `Switch+` (`03-Component/Medium/Switch+`) contient un caractère spécial —
   échapper dans les requêtes.
4. La graphie est `01-Fondation` (français, sans le « u » de foundation) —
   toute création de set doit reprendre cette graphie exacte.
