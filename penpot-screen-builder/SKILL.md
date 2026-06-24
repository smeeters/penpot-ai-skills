---
id: penpot-screen-builder
name: penpot-screen-builder
version: 0.1.0
mode: review
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Build a complete on-system screen from a data structure (JSON payload,
  form schema, API response) using only library components and existing tokens.
  No custom shapes without approval. Triggers on: "construis cet écran",
  "génère une page depuis ce JSON", "crée le formulaire pour ces champs",
  "screen builder", "mise en page depuis les données", "construire l'UI".
---

# penpot-screen-builder — Brief de données → écran on-system

> Différence clé avec `penpot-build-screen` du kit : ce skill part d'une
> **structure de données réelle** (payload JSON, schéma de formulaire,
> liste de champs) — pas d'un brief textuel libre.
> Zéro component custom : tout passe par `penpot-library-mapper`.

---

## 1. Purpose

Transformer une structure de données (fournie par le designer ou extraite
d'une API) en un écran Penpot complet, en utilisant :
- **exclusivement** les composants du manifest `penpot-library-mapper`
- **exclusivement** les tokens du pipeline `penpot-token-pipeline`
- la grille et le layout définis dans les fondations du système

Cas d'usage principaux :
- Formulaire depuis un schéma de champs (`name`, `email`, `role`, etc.)
- Liste/tableau depuis une réponse API
- Dashboard depuis des métriques définies
- Page de détail depuis un modèle de données

---

## 2. Token-Aware Brief Contract

- **Input** : structure de données JSON + (optionnel) type d'écran cible
- **Objective** : écran complet sur une page Penpot, lié aux tokens et composants
- **Constraints** :
  - Manifest `penpot-library-mapper` requis — si absent → CATALOG d'abord
  - Aucun rectangle/shape custom sans approbation explicite
  - Grille 4px/8px obligatoire sur tous les espacements
  - Contenu réaliste (pas de Lorem ipsum, pas de "Label")
- **Acceptance** :
  - Chaque élément UI est une instance de bibliothèque
  - Tous les espacements sont des multiples de 4px
  - Les tokens sont appliqués via `penpot-token-pipeline APPLY`
  - Le résultat passe le `penpot-qa-checklist` à ≥ 80/100

---

## 3. Preconditions

1. `high_level_overview` en premier.
2. Vérifier que le manifest existe : `manifests/<slug>-manifest.json`.
   Si absent → `penpot-library-mapper CATALOG` d'abord, obligatoire.
3. Vérifier que les tokens existent (au moins `02-Semantic`).
   Si absent → `penpot-token-pipeline BOOTSTRAP` d'abord.
4. Parser et valider l'input JSON (voir §4).

---

## 4. Phase PARSE — Analyse de la structure de données

### 4.1 — Détection du type d'écran

À partir de la structure, inférer le pattern UI le plus adapté :

| Structure détectée | Pattern UI |
|-------------------|------------|
| Tableau de clés/valeurs | Formulaire (labels + champs) |
| Array d'objets homogènes | Liste ou tableau de données |
| Objet avec métriques/KPI | Dashboard / cards |
| Objet imbriqué avec sections | Page de détail / accordéon |
| Schéma OpenAPI `properties` | Formulaire typé |

### 4.2 — Extraction des champs

Pour chaque champ, déduire :

```javascript
{
  key:      "email",
  label:    "Adresse e-mail",       // humanisé depuis la clé
  type:     "email",                // string, number, boolean, date, enum, array
  required: true,
  example:  "jean.dupont@acme.fr",  // valeur de démo réaliste
  component: "TextField/Outlined",  // composant cible dans le manifest
  variant:  { size: "md", state: "enabled" }
}
```

### 4.3 — CHECKPOINT 1 — Validation du mapping

Présenter le mapping champ → composant avant toute création :

```
## Mapping détecté

| Champ | Type | Composant | Variant | Contenu |
|-------|------|-----------|---------|---------|
| name | string | TextField/Outlined | md/enabled | "Jean Dupont" |
| email | email | TextField/Outlined | md/enabled | "jean@acme.fr" |
| role | enum | Select/Outlined | md/enabled | "Designer" |
| active | boolean | Switch | md/enabled | ON |
| submit | action | Button/Contained | md/enabled | "Enregistrer" |

Structure : Formulaire vertical · 1 colonne · largeur 480px
Composants manquants dans le manifest : aucun ✅
→ Valider ou modifier avant construction
```

---

## 5. Phase BUILD — Construction de l'écran

### 5.1 — Création du frame principal

```javascript
// ⚠️ createBoard() et non createFrame() (bug #6)
const screen = penpot.createBoard();
screen.name = pageName ?? 'Screen';
screen.resize(WIDTH, HEIGHT); // 375 mobile / 768 tablet / 1280 desktop
screen.fills = [{ color: resolveToken('dark.background.default') }];
// ⚠️ page.root.appendChild() et non page.appendChild() (bug session 1)
penpot.currentPage.root.appendChild(screen);
```

### 5.2 — Layout du frame

```javascript
screen.flex = {
  dir: 'column',
  alignItems: 'flex-start',
  paddingTop: 24, paddingBottom: 24,
  paddingLeft: 24, paddingRight: 24,
  rowGap: 16,      // espacement entre sections
};
```

### 5.3 — Instanciation des composants

Pour chaque champ du mapping, via `penpot-library-mapper` :

```javascript
// Résoudre depuis le manifest — jamais deviner l'index
const comp   = resolveFromManifest(field.component, manifest);
const inst   = comp.instance();
const axis   = getAxis(manifest, field.component, 'state');
const sAxis  = getAxis(manifest, field.component, 'size');
inst.switchVariant(axis.index,  field.variant.state);
inst.switchVariant(sAxis.index, field.variant.size);
screen.appendChild(inst);
```

### 5.4 — Contenu réaliste

Règles de contenu par type de champ :

| Type | Contenu exemple (fr-FR) |
|------|------------------------|
| `string/name` | "Jean Dupont" |
| `string/email` | "jean.dupont@acme.fr" |
| `string/phone` | "+33 6 12 34 56 78" |
| `string/address` | "12 rue de la Paix, 75001 Paris" |
| `number/price` | "1 249,00 €" |
| `number/count` | "42" |
| `date` | "14/06/2026" |
| `enum` | première valeur de l'enum |
| `boolean` | ON (valeur par défaut positive) |
| `id/uuid` | "USR-2847" (abrégé, lisible) |

### 5.5 — Sections et hiérarchie

Pour les structures imbriquées, créer des sections :

```
[Board screen]
  [Board section-informations-personnelles]
    [Text section-title] "Informations personnelles"
    [Instance TextField] Prénom
    [Instance TextField] Nom
    [Instance TextField] Email
  [Board section-role]
    [Text section-title] "Rôle et accès"
    [Instance Select] Rôle
    [Instance Switch] Compte actif
  [Board actions]
    [Instance Button/Text] "Annuler"
    [Instance Button/Contained] "Enregistrer"
```

### 5.6 — CHECKPOINT 2 — Preview structure

Avant d'appliquer les tokens et de finaliser :

```
Écran construit : "Formulaire utilisateur"
  Frame : 480×680px (desktop form)
  Sections : 3 (infos perso, rôle, actions)
  Instances : 7 composants
  Contenu : réaliste (fr-FR) ✅

→ Appliquer les tokens (penpot-token-pipeline APPLY) ?
→ Lancer le QA (penpot-qa-checklist) ?
```

### 5.7 — Application des tokens

Après validation, enchaîner automatiquement :
1. `penpot-token-pipeline APPLY` sur le frame construit
2. `penpot-qa-checklist` → score cible ≥ 80/100
3. Si score < 80 → corriger avant de livrer

---

## 6. Patterns de layout

### Formulaire (1 colonne)
```
width: 480px (desktop) / 343px (mobile)
padding: 24px
gap entre champs: 16px
gap entre sections: 32px
label au-dessus du champ, gap: 6px
```

### Liste / Tableau
```
width: 100% du frame parent
header: sticky si > 5 lignes
row height: 48px (dense: 32px)
col gap: 16px
alternance de fond: background.default / background.paper
```

### Dashboard (cards)
```
grille: 12 colonnes, gutter 24px
card minimum: 3 colonnes
KPI card: 3 col × auto height
chart card: 6 col × 280px
```

### Page de détail
```
sidebar: 240px fixe / contenu: flex-grow
padding contenu: 32px
sections avec titre h2 + séparateur
```

---

## 7. Gestion des composants manquants

Si un champ du mapping ne trouve pas de composant dans le manifest :

```
❌ "DatePicker" introuvable dans la bibliothèque.
   Le plus proche : "TextField/Outlined" (score 0.6)
   Options :
   A) Utiliser TextField avec label "Date (JJ/MM/AAAA)"
   B) Laisser un placeholder [DatePicker manquant]
   C) Créer un composant custom (sera flaggé ⚠️ dans le QA)
→ Quelle option ?
```

Ne jamais improviser silencieusement.

---

## 8. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Je dessine vite un rectangle pour ce champ." | Non — mapper vers le composant le plus proche ou signaler le manque. |
| "Le manifest n'est pas à jour, je connais les composants." | Manifest périmé = re-CATALOG. Jamais de mémoire. |
| "Ce spacing de 13px c'est pas grave pour un écran de test." | Le QA cible ≥ 80/100. 13px → flag immédiat. |
| "Je mets 'Nom' comme contenu, on changera après." | Contenu réaliste dès la construction. La règle est dans le Brief Contract. |
| "L'écran a l'air bien visuellement, le QA n'est pas nécessaire." | Le QA n'est pas optionnel. Il fait partie de l'Acceptance Criteria. |

---

## 9. Fichiers du skill

- `scripts/build-screen.js` — construction complète depuis JSON
- `scripts/parse-schema.js` — parser JSON → mapping champ/composant
- `references/layout-patterns.md` — specs détaillées des 4 patterns
- `references/content-rules.md` — règles de contenu réaliste fr-FR
- `templates/form-schema.json` — template de schéma de formulaire
- `templates/list-schema.json` — template de schéma de liste

## 10. Références

- `shared/plugin-api-gotchas.md`
- Skills requis : `penpot-library-mapper` (manifest),
  `penpot-token-pipeline` (APPLY post-build),
  `penpot-qa-checklist` (validation finale),
  `penpot-annotation` (handoff après validation)
