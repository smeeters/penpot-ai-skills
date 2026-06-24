# Patterns de layout — penpot-screen-builder

## Breakpoints

| Nom | Largeur frame | Padding | Usage |
|-----|--------------|---------|-------|
| mobile | 375px | 16px | Apps mobiles, PWA |
| tablet | 768px | 24px | iPad, surfaces |
| desktop | 1280px | 32px | Web apps, dashboards |
| form-desktop | 480px | 24px | Formulaires isolés |

---

## Pattern 1 — Formulaire

```
┌─────────────────────────────┐
│ [Titre de section]          │ ← Text h6, color: text.primary, mb: 8px
│                             │
│ [Label]                     │ ← Text body2, color: text.secondary
│ [TextField _______________] │ ← gap label/field: 6px
│                             │
│ [Label]                     │
│ [TextField _______________] │ gap entre champs: 16px
│                             │
│ ─────────── gap 32px ────── │
│                             │
│ [Titre section 2]           │
│ [Select ▼ _______________] │
│ [Switch ○] Label            │
│                             │
│      [Annuler] [Enregistrer]│ ← actions alignées à droite
└─────────────────────────────┘

Specs :
- Frame width : 480px (desktop), 343px (mobile)
- Padding : 24px tous côtés
- Gap entre champs : 16px
- Gap entre sections : 32px
- Gap label/champ : 6px
- Boutons : row, gap 8px, alignRight
```

---

## Pattern 2 — Liste / Tableau

```
┌──────────────────────────────────────────┐
│ [Titre]              [Recherche] [+ Créer]│ ← toolbar, height 64px
├────────┬────────────┬─────────┬──────────┤
│ Nom    │ Email      │ Rôle    │ Actions  │ ← header, height 48px, bg: paper
├────────┼────────────┼─────────┼──────────┤
│ J. D.  │ jean@...   │ Admin   │ ✏️ 🗑️  │ ← row, height 48px, alternée
├────────┼────────────┼─────────┼──────────┤
│ M. P.  │ marie@...  │ Editor  │ ✏️ 🗑️  │
└────────┴────────────┴─────────┴──────────┘
│ ◀ 1 2 3 ▶                               │ ← pagination, height 52px

Specs :
- Frame width : 100% parent (1280px desktop)
- Toolbar height : 64px, padding 16px
- Header height : 48px, bg: background.paper
- Row height : 48px (dense: 32px, comfortable: 64px)
- Row alternance : background.default / background.paper
- Col padding : 16px
- Pagination height : 52px
```

---

## Pattern 3 — Dashboard

```
┌──────────────────────────────────────────┐
│ [KPI]   [KPI]   [KPI]   [KPI]           │ ← 4 cards × 3col, height 80px
├──────────────────────┬───────────────────┤
│                      │                   │
│ [Chart principal]    │ [Liste latérale]  │ ← 8col + 4col, height 320px
│                      │                   │
├──────────────────────┴───────────────────┤
│ [Table secondaire]                        │ ← 12col, height 240px
└──────────────────────────────────────────┘

Specs :
- Grille : 12 colonnes, gutter 24px, margin 32px
- KPI card : 3 col × 80px, bg: background.paper, radius: 8px
- Chart card : 8 col × 320px
- Sidebar card : 4 col × 320px
- Table : 12 col × auto
- Gap entre rows : 24px
```

---

## Pattern 4 — Page de détail

```
┌──────────────────────────────────────────┐
│ ← Retour    [Titre de la page]   [Edit] │ ← header, height 64px
├──────────┬───────────────────────────────┤
│          │                               │
│ [Nav     │ [Section 1]                   │
│  latérale│ ──────────                    │
│  240px]  │ champ: valeur                 │
│          │ champ: valeur                 │
│          │                               │
│          │ [Section 2]                   │
│          │ ──────────                    │
│          │ champ: valeur                 │
└──────────┴───────────────────────────────┘

Specs :
- Sidebar width : 240px fixe
- Content padding : 32px
- Section title : h6, mb: 16px
- Séparateur : Divider, mb: 24px
- Champ/valeur : 2 col (label 30% / valeur 70%), row height: 40px
- Gap entre sections : 40px
```

---

## Règles communes

**Espacement** : toujours multiple de 4px — 4, 8, 12, 16, 24, 32, 40, 48px.

**Fond de screen** : `dark.background.default` — jamais hardcodé.

**Composants** : instances de bibliothèque uniquement — jamais de rectangle custom.

**Contenu** : réaliste fr-FR dès la construction — jamais "Label", "Text", "Value".

**Actions** : toujours une action primaire + une action secondaire sur les formulaires.
