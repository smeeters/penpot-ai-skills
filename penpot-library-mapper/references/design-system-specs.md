# Specs des design systems connus + table de synonymes

> Module d'enrichissement de la phase CATALOG. S'applique UNIQUEMENT si la
> bibliothèque est identifiée comme l'un de ces systèmes (par son nom ou sur
> confirmation utilisateur). Une bibliothèque sur mesure = manifest seul.

---

## 1. Table de synonymes cross-systèmes

Résolution d'intention → composant, quel que soit le vocabulaire employé.

| Intention utilisateur | Material UI | IBM Carbon | Atlassian | Termes génériques |
|----------------------|-------------|------------|-----------|-------------------|
| Bouton principal | Button (contained) | Primary button | Primary button | cta, bouton plein |
| Bouton secondaire | Button/Outlined | Secondary button | Default button | bouton contour |
| Bouton discret | Button/Text | Ghost button | Subtle button | text, ghost, subtle, link-button |
| Bouton destructif | Button color=error | Danger button | Danger button | delete, destructive |
| Bouton icône | IconButton | Icon button (ghost) | Icon button | action button |
| Badge de statut | Chip | Tag | Lozenge | badge, pill, étiquette |
| Badge compteur | Badge | — (Tag numérique) | Badge | notification dot |
| Panneau latéral | Drawer | Side panel / UI Shell side-nav | Navigation sidebar | sidebar, volet |
| Onglets | Tabs | Tabs | Tabs | tabulations |
| Champ texte | TextField | Text input | Textfield | input, saisie |
| Zone multi-lignes | TextField multiline | Text area | Textarea | textarea |
| Liste déroulante | Select | Dropdown | Select | combo, picker |
| Interrupteur | Switch | Toggle | Toggle | on/off |
| Case à cocher | Checkbox | Checkbox | Checkbox | — |
| Bouton radio | Radio | Radio button | Radio | — |
| Avertissement inline | Alert | Inline notification | Section message | banner, message |
| Notification flottante | Snackbar | Toast notification | Flag | toast |
| Fenêtre modale | Dialog | Modal | Modal dialog | popup, modale |
| Infobulle | Tooltip | Tooltip | Tooltip | — |
| Barre de progression | LinearProgress | Progress bar | Progress bar | loader |
| Indicateur circulaire | CircularProgress | Loading | Spinner | spinner |
| Fil d'Ariane | Breadcrumbs | Breadcrumb | Breadcrumbs | breadcrumb |
| Pagination | Pagination | Pagination | Pagination | — |
| Tableau de données | Table / DataGrid | Data table | Dynamic table | grid, tableau |
| Accordéon | Accordion | Accordion | — (Expand) | collapse, dépliant |
| Carte | Card | Tile | Card | tuile |
| Avatar | Avatar | — | Avatar | photo profil |
| Menu contextuel | Menu | Overflow menu | Dropdown menu | context menu |
| Étapes | Stepper | Progress indicator | Progress tracker | wizard, étapes |

---

## 2. Material UI (v5.x) — specs clés

| Composant | Spec dimensionnelle |
|-----------|---------------------|
| Button small / medium / large | hauteur 30.75 / 36.5 / 42.25 px (texte), padding 4-10 / 6-16 / 8-22 |
| IconButton | 40×40 (medium), icône 24px |
| Chip small / medium | hauteur 24 / 32 |
| TextField (outlined, medium) | hauteur 56 ; small : 40 |
| Switch | track 34×14, thumb 20 |
| Border radius global | 4px (`theme.shape.borderRadius`) |
| Élévations | 0–24 (Paper elevation), ombres prédéfinies |
| États | enabled, hovered, focused, pressed, disabled — overlays 4%/12%/8%/12% |
| Densité | spacing(1) = 8px |

## 3. IBM Carbon (v11) — specs clés

| Composant | Spec dimensionnelle |
|-----------|---------------------|
| Button sm / md / lg / xl | hauteur 32 / 40 / 48 / 64 px |
| Text input sm / md / lg | hauteur 32 / 40 / 48 |
| Tag | hauteur 18 / 24 (sm/md), radius pleine pilule |
| Toggle | 48×24 |
| Data table row | 32 / 40 / 48 (compact/short/normal) |
| Grille | 2x Grid : colonnes 16, gutter 32 ; mini-unit = 8px |
| Border radius | 0px par défaut (esthétique carrée — NE PAS arrondir) |
| États tokens | `$button-primary-hover`, `$layer-hover`, etc. |
| Typographie | IBM Plex Sans ; échelle productive/expressive |

## 4. Atlassian Design System — specs clés

| Composant | Spec dimensionnelle |
|-----------|---------------------|
| Button default | hauteur 32px, compact 24px |
| Textfield | hauteur 40 (default), compact 32 |
| Lozenge | hauteur 16, uppercase, radius 3px |
| Toggle | 32×16 (regular), 40×20 (large) |
| Avatar | xsmall 16 → xxlarge 96 |
| Grille | base 8px, espacement tokens `space.100` = 8px |
| Border radius | 3px (border.radius), 8px pour cards |
| Typographie | Atlassian Sans ; échelle font.heading / font.body |
| Couleurs | tokens sémantiques `color.background.brand.bold`, etc. |

---

## 5. Usage en phase CATALOG

1. Identifier le système : nom de bibliothèque contenant `mui`, `material`,
   `carbon`, `atlassian`/`adg`, ou confirmation utilisateur.
2. Comparer les hauteurs réelles des composants catalogués aux specs ci-dessus
   → flags de dérive (`Button md = 38px au lieu de 36.5 — intentionnel ?`).
3. Rapport de couverture : composants du DS officiel absents de la
   bibliothèque locale (utile pour prioriser `penpot-component-factory`).
4. Enregistrer le système identifié dans `manifest.conventions.designSystem`
   pour activer les synonymes spécifiques en phase MAP.

## 6. Bibliothèques sur mesure

Aucune spec externe ne s'applique. La phase MAP utilise :
- le manifest (source unique de vérité),
- la colonne « Termes génériques » de la table de synonymes,
- le score de similarité avec seuil de confirmation à 0.8.
