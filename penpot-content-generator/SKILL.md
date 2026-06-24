---
id: penpot-content-generator
name: penpot-content-generator
version: 0.1.0
mode: suggest
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Replace placeholder text (Lorem ipsum, "Label", "Text") with realistic
  fr-FR content and generate edge cases automatically: 120-char labels,
  empty states, null values, negative amounts, special characters.
  Triggers on: "remplace le lorem ipsum", "contenu réaliste", "génère des données",
  "edge cases", "remplir les champs", "contenu de test", "données réalistes".
---

# penpot-content-generator — Contenu réaliste et edge cases

> Un design qui ne révèle ses fragilités qu'en production est un design
> non testé. Ce skill injecte les cas limites dès la phase de conception.

---

## 1. Purpose

Deux modes :

- **FILL** : remplacer les textes de démo (Lorem ipsum, "Label", "Text",
  "Titre", valeurs numériques bidon) par du contenu fr-FR réaliste,
  en respectant la sémantique du calque.
- **EDGE** : générer des variantes de frames avec des cas limites :
  texte très long, valeur nulle, liste vide, montant négatif, caractères
  spéciaux — pour révéler les fragilités du layout avant le dev.

Couplage QA : `penpot-qa-checklist` détecte les textes de démo (QA-5) →
ce skill les remplace. Ils fonctionnent en séquence.

---

## 2. Token-Aware Brief Contract

- **Input** : sélection ou frame courant
- **Objective** : FILL (contenu réaliste) ou EDGE (cas limites)
- **Constraints** :
  - Ne modifier que les shapes `text` — jamais les fills, tokens ou layout
  - Inférer le type de contenu depuis le nom du calque
  - En mode EDGE : créer des copies du frame, ne pas modifier l'original
- **Acceptance** :
  - Zéro "Lorem ipsum" ou texte générique restant (mode FILL)
  - Au moins 5 edge cases générés (mode EDGE)
  - Layout non cassé après injection (vérifier visuellement)

---

## 3. Inférence sémantique du contenu

Le type de contenu est déduit du **nom du calque** (priorité 1)
puis du **contexte parent** (priorité 2).

### 3.1 — Table de mapping calque → type

| Pattern de nom | Type inféré | Exemple de contenu |
|----------------|-------------|-------------------|
| `name`, `prénom`, `nom` | person-name | "Jean Dupont" |
| `email`, `mail`, `courriel` | email | "jean.dupont@acme.fr" |
| `phone`, `tel`, `téléphone` | phone | "+33 6 12 34 56 78" |
| `address`, `adresse` | address | "12 rue de la Paix, 75001 Paris" |
| `city`, `ville` | city | "Paris" |
| `title`, `titre` | title | "Rapport trimestriel Q2 2026" |
| `description`, `desc` | description | "Description complète du produit..." |
| `price`, `prix`, `montant`, `amount` | price | "1 249,00 €" |
| `date`, `_at`, `created`, `updated` | date | "14/06/2026" |
| `time`, `heure` | time | "14:30" |
| `count`, `total`, `nb`, `nombre` | count | "42" |
| `percent`, `taux`, `rate` | percent | "73 %" |
| `id`, `ref`, `code` | id | "USR-2847" |
| `label`, `tag`, `badge` | label | "En cours" |
| `status`, `état`, `state` | status | "Actif" |
| `company`, `société`, `entreprise` | company | "Acme SAS" |
| `role`, `poste`, `fonction` | role | "Designer Senior" |
| `message`, `comment`, `commentaire` | message | "Votre demande a bien été prise en compte." |
| `body`, `content`, `contenu` | body | "Paragraphe de texte réaliste sur deux lignes..." |
| `placeholder`, `hint` | hint | "Saisissez votre adresse e-mail" |
| `button`, `btn`, `cta`, `action` | action | "Enregistrer" |
| `header`, `heading`, `h1`-`h6` | heading | "Tableau de bord" |
| `nav`, `menu` | nav | "Accueil" |
| `error`, `warning` | error | "Ce champ est obligatoire." |
| `success`, `confirmation` | success | "Modifications enregistrées." |
| `empty`, `vide` | empty-state | "Aucun élément à afficher." |
| `lorem`, `ipsum`, `text` | body | → remplacer par body réaliste |

### 3.2 — Corpus de contenu fr-FR

Voir `data/content-corpus.json` — pool de valeurs réalistes par type,
à piocher aléatoirement pour varier le contenu entre instances.

---

## 4. Mode FILL

### 4.1 — Scan et remplacement

```javascript
// Parcours récursif — traiter uniquement les shapes text
function fillContent(shape, context = {}) {
  if (shape.type === 'text') {
    const inferred = inferType(shape.name, context);
    if (shouldReplace(shape.characters)) {
      shape.characters = getContent(inferred);
    }
  }
  (shape.children ?? []).forEach(c => fillContent(c, { parent: shape.name }));
}

function shouldReplace(text) {
  if (!text) return true;
  const t = text.toLowerCase().trim();
  return /^lorem|^ipsum|^text$|^label$|^titre$|^title$|^value$|^valeur$|^name$|^nom$/.test(t)
    || t.length < 3;
}
```

### 4.2 — CHECKPOINT

Avant remplacement, présenter la table de mapping :

```
## Plan de remplacement

| Calque | Texte actuel | Type inféré | Nouveau contenu |
|--------|-------------|-------------|-----------------|
| user-name | "Text" | person-name | "Jean Dupont" |
| email-field | "Label" | email | "jean.dupont@acme.fr" |
| price-tag | "Lorem" | price | "1 249,00 €" |
| description | "Lorem ipsum..." | body | "Rapport Q2 2026..." |

Confirmer ou ajuster avant remplacement.
```

---

## 5. Mode EDGE — Cas limites

### 5.1 — Catalogue des edge cases

| ID | Nom | Ce qu'il teste |
|----|-----|---------------|
| E1 | Texte très long | Troncature, overflow, ellipsis |
| E2 | Texte très court | Espacement minimal, icône seule |
| E3 | Valeur nulle / vide | Empty state, placeholder visible |
| E4 | Montant négatif | Signe −, couleur error |
| E5 | Caractères spéciaux | Encodage, polices fallback |
| E6 | Nombre très grand | Format milliers, débordement |
| E7 | Date ancienne / future | Format cohérent, relative time |
| E8 | Email très long | Troncature dans les champs |
| E9 | Nom très long (prénom composé) | Layout card, avatar |
| E10 | Liste vide | Empty state, call-to-action |
| E11 | Liste très longue (50+ items) | Pagination, scroll, performance |
| E12 | Statut inconnu / null | Badge fallback, "—" |

### 5.2 — Contenu par edge case

```javascript
const EDGE_CASES = {
  E1: { // Texte très long
    'person-name':  'Jean-Baptiste de la Fontaine-Dubois',
    'email':        'jean-baptiste.de-la-fontaine-dubois@tres-longue-entreprise-internationale.fr',
    'title':        'Rapport annuel de performance commerciale et financière — Exercice fiscal 2025-2026',
    'description':  'Description très détaillée qui dépasse largement la hauteur prévue du conteneur ' +
                    'et qui devrait déclencher un débordement ou un comportement de troncature ' +
                    'selon les règles CSS appliquées par les développeurs.',
    'label':        'Statut de validation en attente de confirmation',
    'price':        '1 249 999,99 €',
  },
  E2: { // Texte très court
    'person-name':  'Al',
    'email':        'a@b.fr',
    'title':        'OK',
    'price':        '0 €',
    'label':        '!',
  },
  E3: { // Valeur nulle / vide
    '*':            '',  // chaîne vide — teste le empty state
  },
  E4: { // Montant négatif
    'price':        '−1 249,00 €',
    'count':        '−42',
    'percent':      '−12 %',
  },
  E5: { // Caractères spéciaux
    'person-name':  'Müller-García Ñoño',
    'company':      'L\'Électricité & Cie™',
    'address':      '14, avenue de l\'Épée — Bât. B, 3ème étage',
    'message':      'Test: <script>alert(1)</script> & "quotes" \'apostrophe\'',
  },
  E6: { // Nombre très grand
    'price':        '9 999 999 999,00 €',
    'count':        '1 234 567',
    'percent':      '100 %',
  },
  E9: { // Nom très long
    'person-name':  'Marie-Antoinette de la Croix-Beaumont',
    'role':         'Directrice Générale Adjointe Ressources Humaines & Formation Continue',
  },
  E12: { // Statut null
    'status':       '—',
    'label':        'Inconnu',
    'id':           'N/A',
  },
};
```

### 5.3 — Génération des frames edge case

```javascript
// Créer une copie du frame pour chaque edge case demandé
function generateEdgeFrame(sourceFrame, edgeCaseId) {
  const ec   = EDGE_CASES[edgeCaseId];
  // ⚠️ createBoard() pas createFrame() (bug #6)
  const copy = penpot.createBoard();
  copy.name  = `[EDGE:${edgeCaseId}] ${sourceFrame.name}`;
  copy.x     = sourceFrame.x + (offsetX * edgeCaseIndex);
  copy.y     = sourceFrame.y + sourceFrame.height + 40;
  copy.resize(sourceFrame.width, sourceFrame.height);
  copy.fills = sourceFrame.fills;
  // ⚠️ page.root.appendChild() (bug session 1)
  penpot.currentPage.root.appendChild(copy);
  // Remplir avec le contenu edge case
  applyEdgeContent(copy, ec);
  return copy;
}
```

### 5.4 — CHECKPOINT EDGE

```
## Edge cases à générer

| ID | Nom | Contenu injecté |
|----|-----|-----------------|
| E1 | Texte très long | "Jean-Baptiste de la Fontaine-Dubois..." |
| E3 | Valeur nulle | "" (champs vides) |
| E4 | Montant négatif | "−1 249,00 €" |
| E5 | Caractères spéciaux | "Müller-García Ñoño" |

4 frames générés à droite du frame source.
Confirmer les edge cases à inclure.
```

---

## 6. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Le dev verra bien en intégration si ça déborde." | Un texte de 120 chars détecté maintenant coûte 0 — en intégration, ça coûte une itération. |
| "Je ne génère que le cas nominal, les edge cases c'est pour plus tard." | Mode EDGE disponible sur demande — "plus tard" ne vient jamais. |
| "Ce calque s'appelle 'Text', je ne sais pas quel contenu mettre." | Inférence par contexte parent + proposition au checkpoint — jamais de devinette silencieuse. |
| "Je modifie le frame original pour tester le cas long." | Non — le mode EDGE crée des copies. L'original reste intact. |

---

## 7. Fichiers du skill

- `scripts/fill-content.js` — mode FILL : remplacement du contenu de démo
- `scripts/generate-edge-cases.js` — mode EDGE : génération des cas limites
- `data/content-corpus.json` — pool de valeurs réalistes fr-FR
- `references/edge-case-catalog.md` — catalogue des 12 edge cases

## 8. Références

- `shared/plugin-api-gotchas.md`
- Couplage : `penpot-qa-checklist` QA-5 (textes de démo) → ce skill
- `penpot-screen-builder` : contenu réaliste dès la construction
