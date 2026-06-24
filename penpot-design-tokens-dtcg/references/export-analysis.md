# Analyse de l'export tokens — tokens.zip

> Analyse réalisée le 2026-06-15 sur l'export Tokens Studio depuis Penpot 2.15.4

## Structure

```
57 fichiers JSON · 1119 tokens · 29 thèmes
```

| Fichier | Tokens | Rôle |
|---------|--------|------|
| `01-Fondation.json` | 245 | Valeurs littérales (couleurs, spacing, typo…) |
| `02-Semantic.json` | 274 | Aliases vers Fondation (namespace `dark.*`) |
| `03-Component/Base/*.json` | ~400 | États par composant (aliases vers Semantic) |
| `03-Component/Small/*.json` | ~60 | Overrides dimensionnels Small |
| `03-Component/Medium/*.json` | ~60 | Overrides dimensionnels Medium |
| `03-Component/Large/*.json` | ~60 | Overrides dimensionnels Large |
| `03-Component/*.json` (singuliers) | ~120 | Dialog, Link, Menu, Snackbar, Tab, Tooltip |

## Format des tokens

**Format** : Tokens Studio (`$value`/`$type`) — directement compatible DTCG.

```json
{
  "dark": {
    "primary": {
      "main": {
        "$value": "{color.vert.main}",
        "$type": "color",
        "$description": ""
      }
    }
  }
}
```

## Chaîne de résolution des aliases

```
03-Component : {dark.text.primary}
    ↓
02-Semantic  : {color.vert.main}
    ↓
01-Fondation : #66bb6a
```

Style Dictionary résout automatiquement via deep merge dans l'ordre `tokenSetOrder`.

## Particularités

### 1. Tokens typography composites (29 dans 01-Fondation)
`$value` est un objet, pas une chaîne :
```json
"body1": {
  "$value": {
    "fontFamilies": ["Roboto"],
    "fontSizes": "16",
    "fontWeights": "400"
  },
  "$type": "typography"
}
```
→ Éclatés en sous-tokens par `consolidate.js`

### 2. Thèmes actifs vs vides
- `NG-small` : 30 sets enabled → résolution Small par défaut
- `NG-Medium` : 26 sets enabled → résolution Medium
- 27 autres thèmes : 0 sets enabled → ignorés dans le pipeline

### 3. Fichier Switch+.json
Nom avec caractère spécial `+` — géré nativement par Node.js `fs.readFileSync`.

### 4. tokenSetOrder
L'ordre dans `$metadata.json` est crucial : les sets Size écrasent les sets Base
pour les mêmes clés. La consolidation doit respecter cet ordre.

### 5. 01-Fondation contient des "alias" de typography
Les 29 tokens typography de la Fondation ont `$value` objet (composite) —
ce sont des définitions complexes, pas des vraies références circulaires.
Ils sont traités comme des tokens complexes, pas des aliases.

## Types de tokens dans l'export

| Type | Fondation | Semantic | Component |
|------|-----------|----------|-----------|
| color | 102 | 240+ | nombreux |
| spacing | 20 | ~20 | ~30 |
| sizing | 34 | ~15 | ~20 |
| borderRadius | 9 | ~5 | ~5 |
| borderWidth | 4 | ~5 | ~10 |
| opacity | 10 | ~10 | ~5 |
| typography | 29 | 0 | 0 |
| shadow | 8 | ~5 | ~3 |
| dimension | 16 | ~10 | ~10 |
| number | 12 | ~5 | ~5 |
| fontFamilies | 1 | 0 | 0 |
