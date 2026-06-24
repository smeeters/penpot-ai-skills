---
id: penpot-prototype-flows
name: penpot-prototype-flows
version: 0.1.0
mode: review
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Create prototype flows and interactions in Penpot: navigate-to, overlays,
  after-delay transitions, animations (Dissolve, Slide, Push). Audit existing
  flows and generate linear flows from a list of screens.
  Triggers on: "ajoute des interactions", "prototype ce flow", "câble les écrans",
  "ajoute une animation", "crée le flow de navigation", "open overlay",
  "after-delay", "prototype flows".
---

# penpot-prototype-flows — Interactions & Flows

> Source : API officielle Penpot Plugins (doc.plugins.penpot.app)
> Toutes les valeurs de paramètres sont extraites de la spec TypeScript.

---

## 1. Référence API complète

### 1.1 — Interface Interaction

```typescript
interface Interaction {
  shape?:  Shape;    // shape qui porte l'interaction
  trigger: Trigger;  // déclencheur
  delay?:  number;   // ms — uniquement pour 'after-delay'
  action:  Action;   // ce qui se passe
  remove(): void;    // supprimer l'interaction
}
```

### 1.2 — Triggers disponibles

| Valeur | Déclencheur |
|--------|-------------|
| `'click'` | Clic de l'utilisateur sur la shape |
| `'mouse-enter'` | Souris entre dans la shape |
| `'mouse-leave'` | Souris quitte la shape |
| `'after-delay'` | Après N ms sans interaction utilisateur |

### 1.3 — Actions disponibles

| Type | Paramètres clés |
|------|----------------|
| `'navigate-to'` | `destination: Board`, `animation?`, `preserveScrollPosition?` |
| `'open-overlay'` | `destination: Board`, `position?`, `animation?`, `closeWhenClickOutside?`, `addBackgroundOverlay?`, `relativeTo?` |
| `'toggle-overlay'` | Mêmes params que open-overlay |
| `'close-overlay'` | `destination?: Board` (null = self) |
| `'previous-screen'` | Aucun paramètre — retour à l'écran précédent |
| `'open-url'` | `url: string` |

### 1.4 — Positions d'overlay

```
'center' | 'top-left' | 'top-right' | 'top-center'
'bottom-left' | 'bottom-right' | 'bottom-center' | 'manual'
```
Pour `'manual'` : fournir `manualPositionLocation: { x, y }`.

### 1.5 — Animations

#### Dissolve
```typescript
{
  type:     'dissolve',
  duration: 300,                // ms
  easing?:  'ease-in-out',     // linear|ease|ease-in|ease-out|ease-in-out
}
```

#### Slide
```typescript
{
  type:         'slide',
  way:          'in',          // 'in' | 'out'
  direction:    'left',        // 'left'|'right'|'up'|'down'
  duration:     300,
  offsetEffect?: false,         // effet de parallaxe
  easing?:      'ease-in-out',
}
```

#### Push
```typescript
{
  type:      'push',
  direction: 'left',           // 'left'|'right'|'up'|'down'
  duration:  300,
  easing?:   'ease-in-out',
}
```

---

## 2. Guide de sélection d'animation

| Cas d'usage | Animation recommandée |
|-------------|----------------------|
| Navigation principale | `Slide way:'in' direction:'left'` |
| Retour arrière | `Slide way:'out' direction:'right'` |
| Modal / Dialog | `Dissolve` |
| Bottom sheet mobile | `Slide way:'in' direction:'down'` |
| Drawer latéral | `Slide way:'in' direction:'left'` |
| Tooltip / Popover | `Dissolve` (court, 150ms) |
| Transition entre onglets | `Push direction:'left'` |
| Splash / Onboarding | `Dissolve easing:'ease-in-out'` |

---

## 3. Patterns de prototyping

### 3.1 — Flow linéaire

Connecter N boards en séquence (click → suivant) :

```javascript
// Voir scripts/create-linear-flow.js
// Boards dans l'ordre → A→B→C→D avec bouton retour sur chaque
```

### 3.2 — Overlay / Modal

```javascript
// Bouton qui ouvre une dialog
button.addInteraction({
  trigger: 'click',
  action: {
    type: 'open-overlay',
    destination: dialogBoard,
    position: 'center',
    closeWhenClickOutside: true,
    addBackgroundOverlay: true,
    animation: { type: 'dissolve', duration: 200, easing: 'ease-out' },
  }
});
```

### 3.3 — Drawer mobile

```javascript
// Burger → open drawer (slide depuis la gauche)
burger.addInteraction({
  trigger: 'click',
  action: {
    type: 'open-overlay',
    destination: drawerBoard,
    position: 'top-left',
    closeWhenClickOutside: true,
    animation: { type: 'slide', way: 'in', direction: 'left', duration: 300 },
  }
});
```

### 3.4 — After-delay (splash / autoplay)

```javascript
// Splash screen → home après 2 secondes
splashBoard.addInteraction({
  trigger: 'after-delay',
  delay: 2000,
  action: {
    type: 'navigate-to',
    destination: homeBoard,
    animation: { type: 'dissolve', duration: 400 },
  }
});
```

### 3.5 — Hover state

```javascript
// Hover sur un bouton → montrer un tooltip
button.addInteraction({
  trigger: 'mouse-enter',
  action: {
    type: 'open-overlay',
    destination: tooltipBoard,
    position: 'top-center',
    relativeTo: button,
    animation: { type: 'dissolve', duration: 150 },
  }
});
button.addInteraction({
  trigger: 'mouse-leave',
  action: { type: 'close-overlay', destination: tooltipBoard }
});
```

---

## 4. Audit d'interactions

Voir `scripts/audit-interactions.js` — inventaire complet des interactions
d'une page : coverage par board, types de triggers utilisés, boards sans
interactions.

---

## 5. Workflow lo-fi → hi-fi

```
1. Lo-fi : boards nommés, layout validé (penpot-screen-builder)
2. Connecter les flows (scripts/create-linear-flow.js)
3. Ajouter les overlays (scripts/add-overlays.js)
4. Appliquer les tokens (penpot-token-pipeline APPLY)
5. Vérifier le QA (penpot-qa-checklist)
6. Tester en mode prototype dans Penpot
```

---

## 6. Anti-Rationalization Table

| Excuse | Contre-mesure |
|--------|---------------|
| "Je câble les écrans manuellement, c'est plus rapide." | Sur 10+ boards, le script est 5× plus rapide et sans oubli. |
| "Je choisis l'animation au feeling." | La table §2 donne le bon choix selon le cas d'usage. Pas de feeling. |
| "Je mets un Dissolve partout, c'est neutre." | Dissolve sur une navigation principale est moins naturel qu'un Slide. |
| "Les interactions after-delay n'ont pas besoin de validation." | Un splash de 2s sur mobile est long — valider avec l'utilisateur. |

---

## 7. Fichiers du skill

- `scripts/create-linear-flow.js` — flow linéaire A→B→C→D
- `scripts/add-overlays.js` — ajout d'overlays depuis un mapping
- `scripts/audit-interactions.js` — inventaire des interactions existantes
- `references/interaction-api.md` — référence complète de l'API

## 8. Références

- `shared/plugin-api-gotchas.md`
- API officielle : https://doc.plugins.penpot.app/interfaces/Interaction
- Skills liés : `penpot-screen-builder` (créer les boards),
  `penpot-qa-checklist` (valider avant test prototype)
