# Changelog — penpot-token-pipeline

## v0.3.0

### Ajouté
- **WORKFLOW.md** — nouvelle section "APPLY — garde-fous terrain (NON
  SKIPPABLES)" : 7 règles procédurales courtes issues de production réelle
  (audit fills+strokes, classification par `shape.type`, garde-fou toggle,
  `applyToSelected` pour les boards, anti-doublon par permutation de
  segments, strokes en appel séparé, chunk de 10 + navigation par ID de page).
- **references/apply-pitfalls.md** — nouveau fichier de débogage : 10
  sections symptôme → cause → parade (toggle `applyToken`, échec silencieux
  sur boards, texte/icône/board vide, asynchronisme, doublons à segments
  permutés, conflits de chemin hiérarchique, timeouts + audit post-coupure,
  navigation de page, opacités d'overlay hover/focus, checklist de clôture).

### Contexte
Consolidation des enseignements de la session de tokenisation Astralan
(Button × 3 styles × 7 intents, Button Group, Radio, Switch, Snackbar,
Badge, échelles couleur Blueprint, variantes alpha). Les pièges documentés
ont chacun coûté des corrections manuelles répétées ; ils sont désormais
prévenus en amont par les garde-fous du WORKFLOW.

### Migration
Aucune. Ajout de documentation uniquement — aucun changement de script ni
de structure de tokens.
