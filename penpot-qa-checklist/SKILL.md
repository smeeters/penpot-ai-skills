---
id: penpot-qa-checklist
name: penpot-qa-checklist
version: 0.1.0
mode: suggest
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Pre-handoff quality audit for Penpot designs: hardcoded values vs tokens,
  4px/8px grid compliance, naming hygiene, component instance integrity,
  detached/overridden instances, empty groups. Produces a scored report with
  prioritized fixes. Triggers on: "vérifie la qualité", "audit qualité",
  "checklist avant handoff", "QA ce frame", "prêt pour le dev ?",
  "nettoie ce fichier".
---

# penpot-qa-checklist — Revue qualité pre-handoff

> Un écran est « fini » quand ce skill ne remonte plus de ❌.
> 6 familles de contrôles, un score, des correctifs priorisés.
> Mode `suggest` : ce skill NE MODIFIE RIEN — il rapporte.

---

## 1. Purpose

Audit systématique d'un frame, d'une page ou d'une sélection avant handoff
développeur ou avant publication en bibliothèque. Remplace la revue manuelle
par un rapport reproductible, avec un score de qualité comparable d'un audit
à l'autre.

Les corrections sont routées vers les skills compétents — jamais appliquées
directement par celui-ci.

---

## 2. Token-Aware Brief Contract

- **Context** : scope (sélection > frame courant > page), profil de sévérité
- **Objective** : rapport scoré, ou contrôle ciblé (ex. "juste les tokens")
- **Constraints** : lecture seule ; les fixes proposés référencent le skill
  qui les exécutera (`penpot-token-pipeline`, `penpot-rename-layers`,
  `penpot-library-mapper`)
- **Acceptance** : chaque finding = règle + élément + valeur constatée +
  valeur attendue + skill de correction

---

## 3. Preconditions

1. `high_level_overview` puis `shapeStructure` sur le scope.
2. Charger les sets de tokens (`01-Fondation`, `02-Semantic`, `03-Component/**`)
   — s'ils n'existent pas, les contrôles QA-1 dégradent en « inventaire des
   valeurs brutes » et le rapport recommande un bootstrap
   (`penpot-token-pipeline` workflow C).
3. Si un manifest `penpot-library-mapper` existe, le charger pour QA-4.

---

## 4. Les 6 familles de contrôles

### QA-1 — Tokenisation (poids 30%)

| Règle | Sévérité |
|-------|----------|
| Couleur de fill/stroke hardcodée alors qu'un token résout à cette valeur | ❌ error |
| Couleur hardcodée sans token correspondant | ⚠️ warning (candidat token) |
| Spacing/padding/gap littéral couvert par un token | ❌ error |
| Radius/border-width littéral couvert par un token | ❌ error |
| Typographie non liée à un style/token typo | ⚠️ warning |

### QA-2 — Grille & géométrie (poids 20%)

| Règle | Sévérité |
|-------|----------|
| Spacing/gap/padding hors grille 4px (7, 13, 18px…) | ❌ error |
| Dimensions hors grille 4px sur conteneurs structurels | ⚠️ warning |
| Coordonnées x/y non entières (demi-pixels → rendu flou) | ⚠️ warning |
| Désalignement < 4px entre éléments voisins (probable erreur) | ⚠️ warning |
| Espacements incohérents dans une même pile flex (12, 16, 12, 14) | ❌ error |

### QA-3 — Hygiène des calques (poids 15%)

| Règle | Sévérité |
|-------|----------|
| Nom générique (`Rectangle 47`, `Group 12`, `Board 3`, `Text 8`) | ❌ error → `penpot-rename-layers` |
| Groupe vide ou à enfant unique sans rôle | ⚠️ warning |
| Calque invisible (opacity 0 / hidden) oublié | ⚠️ warning |
| Shape 100% hors du board parent | ⚠️ warning |
| Profondeur d'imbrication > 6 niveaux | 💡 info |

### QA-4 — Intégrité des composants (poids 20%)

| Règle | Sévérité |
|-------|----------|
| Instance détachée d'un composant de bibliothèque (reconstruction locale) | ❌ error → `penpot-library-mapper` |
| Élément custom reproduisant visuellement un composant du manifest | ⚠️ warning |
| Override de couleur/taille divergeant du master sans justification | ⚠️ warning |
| Composant local dupliquant un composant de bibliothèque connectée | ❌ error |

### QA-5 — États & complétude (poids 10%)

| Règle | Sévérité |
|-------|----------|
| Composant interactif sans variants d'état (hover/focus/disabled) | ⚠️ warning |
| Formulaire sans état erreur visible dans le fichier | ⚠️ warning |
| Liste/tableau sans état vide (empty state) | 💡 info |
| Texte de démo (`Lorem ipsum`, `Text`, `Label`) dans un écran final | ⚠️ warning |

### QA-6 — Pré-accessibilité (poids 5%)

Délégué : exécute les contrôles rapides (contraste, target size) et route
vers `penpot-wcag22` pour l'audit complet.

| Règle | Sévérité |
|-------|----------|
| Contraste texte < 4.5:1 (échantillonnage rapide) | ❌ error → `penpot-wcag22` |
| Cible interactive < 24×24px | ❌ error → `penpot-wcag22` |

---

## 5. Scoring

```
Score = 100 − Σ (pénalités × poids de famille)
  ❌ error   = 10 pts (avant pondération)
  ⚠️ warning = 3 pts
  💡 info    = 0 pt (listé, non pénalisant)

Verdict :
  ≥ 90  ✅ PRÊT pour handoff
  70–89 🟡 CORRECTIONS MINEURES — handoff possible avec réserves listées
  < 70  🔴 NON PRÊT — corriger les ❌ d'abord
```

Le score est plafonné famille par famille (une famille catastrophique ne
peut pas absorber tout le budget) — voir `scripts/qa-audit.js`.

---

## 6. Format du rapport

```
## QA — [Frame] — [date] — Score : 76/100 🟡

### ❌ Errors (7)
| # | Famille | Élément | Constaté | Attendu | Fix via |
|---|---------|---------|----------|---------|---------|
| 1 | QA-1 | card/title | fill #e0e0e0 hardcodé | {dark.text.primary} | penpot-token-pipeline B |
| 2 | QA-2 | form > stack | gap 13px | 12 ou 16 (grille 4px) | manuel |
| 3 | QA-3 | Rectangle 47 | nom générique | nom sémantique | penpot-rename-layers |
| 4 | QA-4 | Button (header) | instance détachée | instance liée Button/Text | penpot-library-mapper |

### ⚠️ Warnings (5) …
### 💡 Info (2) …

### Plan de correction priorisé
1. penpot-rename-layers sur le frame (débloque QA-1 et QA-4 fiables)
2. penpot-token-pipeline APPLY sur les 4 valeurs hardcodées
3. Re-instancier le bouton détaché via penpot-library-mapper
4. Re-run QA → objectif ≥ 90
```

⚠️ L'ordre du plan compte : le renommage d'abord (les autres contrôles
matchent par nom de calque), les tokens ensuite, les instances enfin.

---

## 7. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "C'est un warning, pas grave, je valide quand même." | Le verdict est calculé, pas négocié. 🟡 = réserves LISTÉES dans le handoff. |
| "Ce gap de 13px est sûrement voulu." | Peut-être — alors documenté comme exception, sinon corrigé. Jamais ignoré en silence. |
| "Je corrige directement les fills pendant l'audit." | Mode suggest = lecture seule. La correction passe par le skill compétent, avec son propre checkpoint. |
| "Le score était 91 la semaine dernière, inutile de re-auditer." | Tout handoff = audit frais. Le score précédent ne couvre pas les modifs récentes. |
| "Trop de findings, je remonte juste le top 5." | Le rapport est complet. La priorisation est dans le plan, pas dans l'omission. |

---

## 8. Fichiers du skill

- `scripts/qa-audit.js` — audit complet 6 familles, scoring, rapport console
- `references/qa-rules.md` — détail des règles, seuils ajustables, profils

## 9. Références

- Skills de correction : `penpot-token-pipeline`, `penpot-rename-layers`,
  `penpot-library-mapper`, `penpot-wcag22`
- `shared/plugin-api-gotchas.md`
