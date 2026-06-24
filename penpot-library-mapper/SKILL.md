---
id: penpot-library-mapper
name: penpot-library-mapper
version: 0.1.0
mode: review
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Catalog any component library (IBM Carbon, Atlassian, MUI, custom) into a
  persistent manifest, then map natural-language requests to existing library
  components and variants. Enforces instantiation over custom creation.
  Triggers on: "utilise la bibliothèque", "instancie un bouton", "catalogue la
  librairie", "quel composant pour", "mappe ce design system", "library mapper".
---

# penpot-library-mapper — Cataloguer et exploiter toute bibliothèque

> Règle d'or : **ne jamais créer ce que la bibliothèque fournit déjà.**
> Ce skill transforme une bibliothèque inconnue en catalogue exploitable,
> puis route chaque demande vers le bon composant + variant.

---

## 1. Purpose

Deux capacités, agnostiques de la bibliothèque :

- **CATALOG** : scanner une bibliothèque Penpot (locale ou connectée) et
  produire un **manifest** persistant : composants, variants, propriétés,
  tailles, conventions de nommage.
- **MAP & INSTANTIATE** : traduire une demande en langage naturel
  ("un bouton destructif", "ghost button", "lozenge succès") vers le composant
  exact du manifest, l'instancier et configurer ses variants.

Fonctionne avec IBM Carbon, Atlassian Design System, Material UI, ou toute
bibliothèque sur mesure — la phase CATALOG découvre la structure réelle au
lieu de la supposer.

---

## 2. Token-Aware Brief Contract

- **Context** : quelle bibliothèque (si plusieurs connectées, demander)
- **Objective** : cataloguer / instancier / vérifier la couverture
- **Constraints** :
  - Instance de bibliothèque UNIQUEMENT — jamais de reconstruction custom
  - Pas de `.detach()` sans approbation explicite
  - Si le composant demandé n'existe pas dans le manifest → le dire,
    proposer le plus proche, ne JAMAIS improviser un substitut silencieusement
- **Acceptance** : chaque élément placé est une instance liée, variants
  configurés via `switchVariant`, zéro élément custom non signalé

---

## 3. Preconditions

1. `high_level_overview` en premier.
2. Vérifier qu'un manifest existe pour la bibliothèque cible :
   `manifests/<library-slug>-manifest.json` dans le dossier du skill.
3. **Pas de manifest → exécuter CATALOG d'abord** (jamais de mapping à
   l'aveugle sur une bibliothèque non cataloguée).
4. Manifest plus vieux que la bibliothèque (version Penpot du fichier
   modifiée) → proposer un re-catalogage.

---

## 4. Phase CATALOG

### Étapes

**4.1 — Découverte** (voir `scripts/catalog-library.js`)
- Lister `penpot.library.local.components` + bibliothèques connectées
  (`penpot.library.connected`)
- ⚠️ Filtrer les variants avec `.isVariant && c.isVariant()` — le conteneur
  principal n'est pas un variant
- Pour chaque composant : nom, chemin (groupes `/`), variants disponibles,
  propriétés de variant (axes : state, size, type…), dimensions du main instance

**4.2 — Inférence des conventions**
- Séparateur de hiérarchie (`/` chez MUI : `Button/Outlined`)
- Axes de variants détectés (ex. `state=enabled|hovered|…`, `size=sm|md|lg`)
- Index des axes pour `switchVariant(index, value)` — **l'index est
  positionnel**, le manifest doit l'enregistrer explicitement

**4.3 — Enrichissement design-system** (si bibliothèque connue)
- Croiser avec `references/design-system-specs.md` : terminologie officielle,
  specs dimensionnelles attendues, composants standard manquants
- Produire un **rapport de couverture** : composants du DS officiel présents /
  absents de la bibliothèque

**4.4 — CHECKPOINT — Manifest généré**
Sauvegarder le JSON (schéma : `references/manifest-schema.md`) dans
`manifests/<slug>-manifest.json`. C'est le livrable persistant : les sessions
suivantes le chargent au lieu de re-scanner.

---

## 5. Phase MAP & INSTANTIATE

### 5.1 Résolution terminologique

La demande utilisateur passe par trois tables, dans l'ordre :

1. **Manifest** — match direct sur le nom de composant de LA bibliothèque
2. **Table de synonymes cross-systèmes** (`references/design-system-specs.md`) :

| Intention | MUI | Carbon | Atlassian | Générique |
|-----------|-----|--------|-----------|-----------|
| Bouton discret | Button/Text | Ghost button | Subtle button | text/ghost/subtle |
| Badge de statut | Chip | Tag | Lozenge | badge/pill |
| Menu latéral | Drawer | Side panel / UI shell | Navigation sidebar | drawer/sidebar |
| Avertissement inline | Alert | Inline notification | Section message | alert/banner |
| Sélecteur on/off | Switch | Toggle | Toggle | switch/toggle |
| Infobulle | Tooltip | Tooltip | Tooltip | tooltip |
| Champ texte | TextField | Text input | Textfield | input |

3. **Similarité de nom** — fallback fuzzy sur le manifest, avec score affiché

### 5.2 Règle de non-substitution

Si la résolution échoue ou si le score est faible :
```
❌ "Lozenge" introuvable dans la bibliothèque "MaLibrairie".
   Le plus proche : "Chip" (badge de statut, score 0.7).
   → Utiliser Chip ? Ou créer un composant custom (signalé comme tel) ?
```
Ne JAMAIS instancier silencieusement un substitut, ni reconstruire le
composant manquant en shapes primitives sans accord.

### 5.3 Instanciation (voir `scripts/instantiate-component.js`)

1. Retrouver le composant par ID du manifest
2. `component.instance()` → placer aux coordonnées cibles
3. Configurer les variants : `instance.switchVariant(index, value)` pour
   chaque axe demandé — **index lu depuis le manifest**, jamais deviné
4. ⚠️ Modifications de texte (label du bouton…) : l'instance non détachée
   reste liée au master. Si l'API de la bibliothèque expose le texte en
   override, l'utiliser ; sinon `.detach()` avec approbation
5. `penpot.selection = [instance]` pour localiser le résultat

---

## 6. Cas multi-bibliothèques

Fichier avec plusieurs bibliothèques connectées (ex. Carbon + librairie
maison) :
- Chaque manifest porte son `librarySlug` — les demandes ambiguës déclenchent
  une question ("Carbon ou MaLibrairie ?")
- Une demande peut spécifier : "un toggle Carbon" → route directe
- Le rapport d'instanciation indique toujours la bibliothèque source

---

## 7. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Je connais MUI, pas besoin de cataloguer." | La bibliothèque LOCALE diffère toujours du DS officiel. CATALOG d'abord. |
| "Le composant n'existe pas, je le dessine vite en rectangles." | Non-substitution : signaler, proposer le plus proche, attendre l'accord. |
| "Je devine l'index du switchVariant, c'est sûrement 0." | L'index est positionnel et fragile. Toujours lu depuis le manifest. |
| "Le manifest date d'hier, ça ira." | Comparer la date de modif du fichier Penpot. Bibliothèque modifiée = re-catalog. |
| "Je détache l'instance pour changer le label, c'est plus simple." | Détacher casse la liaison au master définitivement. Approbation d'abord. |
| "Cette bibliothèque custom ressemble à Carbon, j'applique les specs Carbon." | Les specs externes n'enrichissent que les DS identifiés. Sur mesure = manifest seul. |

---

## 8. Fichiers du skill

- `scripts/catalog-library.js` — scan → manifest JSON
- `scripts/instantiate-component.js` — résolution + instanciation + variants
- `references/manifest-schema.md` — schéma du manifest
- `references/design-system-specs.md` — specs MUI / Carbon / Atlassian + synonymes
- `manifests/` — manifests générés (persistants, un par bibliothèque)

## 9. Références

- `shared/plugin-api-gotchas.md`
- Skills liés : `penpot-token-pipeline` (tokeniser après instanciation),
  `penpot-component-factory` (créer ce qui manque, sur accord)
