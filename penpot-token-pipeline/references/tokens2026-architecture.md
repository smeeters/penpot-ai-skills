# Token Architecture Rule — Astralan Design System

**Version** : 1.0  
**Scope** : Tout projet utilisant les tokens Astralan (Penpot, Style Dictionary,
Storybook, ou tout autre outil de design/code)  
**Statut** : Règle non négociable — s'applique à toute l'équipe

---

## 1. Principe

Les tokens sont organisés en **3 niveaux hiérarchiques stricts**.
Chaque niveau ne peut référencer que le niveau immédiatement inférieur.
Aucun saut, aucune valeur littérale en dehors du niveau Fondation.

```
┌─────────────────────────────────────────────────────────┐
│  03-Composants   tokens métier, par composant           │
│  ex: accordion.bg, button.contained.bg.primary          │
│                      │ référence uniquement             │
├──────────────────────▼──────────────────────────────────┤
│  02-Semantique   alias fonctionnels, rôles visuels      │
│  ex: color.surface.panel, color.text.primary            │
│                      │ référence uniquement             │
├──────────────────────▼──────────────────────────────────┤
│  01-Fondation    primitifs bruts, valeurs littérales    │
│  ex: color.gray.600 = #252A31, spacing.16 = 16          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Règles par niveau

### 01-Fondation
- **Contient** : valeurs littérales uniquement (hex, px, rem, nombres, chaînes)
- **Peut référencer** : rien — toujours une valeur finale
- **Ne peut pas** : référencer un autre token

```json
// ✅ Correct
"color.gray.600": { "$value": "#252A31", "$type": "color" }
"spacing.16":     { "$value": "16",      "$type": "spacing" }
"opacity.8":      { "$value": "0.08",    "$type": "opacity" }

// ❌ Interdit
"color.gray.600": { "$value": "{color.dark.base}", "$type": "color" }
```

### 02-Semantique
- **Contient** : alias par rôle fonctionnel (surface, text, intent, border, icon, action…)
- **Peut référencer** : tokens `01-Fondation` uniquement
- **Ne peut pas** : contenir de valeur littérale, référencer `03-Composants`

```json
// ✅ Correct
"color.surface.panel":  { "$value": "{color.gray.600}", "$type": "color" }
"color.text.primary":   { "$value": "{color.gray.50}",  "$type": "color" }
"action.hover":         { "$value": "rgba(255,255,255,0.08)", "$type": "color" }
// Note : rgba() = valeur littérale complexe → acceptable dans 02 si aucun
// primitif de 01 ne peut l'exprimer (opacité calculée).

// ❌ Interdit — valeur littérale directe
"color.surface.panel": { "$value": "#252A31", "$type": "color" }

// ❌ Interdit — référence vers 03-Composants
"color.surface.panel": { "$value": "{accordion.bg}", "$type": "color" }
```

### 03-Composants
- **Contient** : tokens par composant et par propriété visuelle
- **Peut référencer** : tokens `02-Semantique` uniquement
- **Ne peut pas** : contenir de valeur littérale, référencer `01-Fondation`

```json
// ✅ Correct
"accordion.bg":           { "$value": "{color.surface.panel}", "$type": "color" }
"accordion.text":         { "$value": "{color.text.primary}",  "$type": "color" }
"accordion.bg-hover":     { "$value": "{action.hover}",        "$type": "color" }
"accordion.text-disabled":{ "$value": "{color.text.disabled}", "$type": "color" }

// ❌ Interdit — saut de niveau (03 → 01)
"accordion.bg": { "$value": "{color.gray.600}", "$type": "color" }

// ❌ Interdit — valeur littérale dans 03
"accordion.bg": { "$value": "#252A31", "$type": "color" }
```

---

## 3. Convention de nommage

### 01-Fondation
```
[type].[famille].[échelle]
color.gray.600
color.blue.400
spacing.16
opacity.8
border-radius.4
font.size.14
shadow.md
```

### 02-Semantique
```
[type].[domaine].[rôle]
color.surface.panel
color.surface.card
color.text.primary
color.text.disabled
color.intent.primary
color.border.default
color.icon.default
action.hover
action.selected
size.button.md
```

### 03-Composants
```
[composant].[élément].[propriété]-[état]
accordion.bg
accordion.bg-hover
accordion.text-disabled
accordion.icon
button.contained.bg.primary
button.contained.bg.primary-hover
textfield.border-focus
```

---

## 4. Noms de sets Penpot (projet Astralan)

| Niveau | Nom du set dans Penpot Tokens |
|---|---|
| Fondation | `01-Fondation` |
| Sémantique | `02-Semantique` |
| Composants | `03-Composants` |

L'ordre de chargement doit toujours être : `01-Fondation` → `02-Semantique`
→ `03-Composants`. Ne jamais réorganiser cet ordre dans `$metadata.tokenSetOrder`.

---

## 5. Procédure en cas de token manquant

Quand aucun token `03-Composants` approprié n'existe pour un composant :

```
1. Identifier le rôle visuel du fill/stroke/dimension manquant
2. Vérifier si un token 02-Semantique correspond à ce rôle
3. Si oui → créer le token 03-Composants qui le référence
4. Si non → créer d'abord le token 02-Semantique (et vérifier 01-Fondation)
5. Appliquer le token 03-Composants fraîchement créé
6. Documenter l'ajout dans le changelog du set
```

Ne jamais sauter les étapes 3-4 pour gagner du temps.

---

## 6. Violations courantes et corrections

| Violation | Correction |
|---|---|
| Token `02` appliqué directement sur un composant | Créer le token `03` correspondant |
| Valeur hex en dur dans `03-Composants` | Créer le token `01` + `02` + router |
| Token `01` référencé depuis `03` | Intercaler le token `02` manquant |
| Deux composants différents partagent le même token `03` | Créer deux tokens `03` distincts (même valeur, noms différents) |

---

## 7. Référence croisée

Ce fichier est référencé par :
- `penpot-token-pipeline/WORKFLOW.md` — workflow de création/application
- `penpot-token-pipeline/scripts/bootstrap-tokens.js` — génération automatique
- `penpot-token-pipeline/scripts/apply-tokens.js` — vérification avant application
- `~/.claude/CLAUDE.md` (optionnel, local) — règle globale Claude Code
