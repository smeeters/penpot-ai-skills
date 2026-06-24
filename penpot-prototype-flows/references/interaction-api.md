# Référence API — Interactions Penpot

> Source : doc.plugins.penpot.app (juin 2026, Penpot 2.15.x)
> Extraite de la spec TypeScript officielle.

---

## addInteraction()

```typescript
shape.addInteraction({
  trigger: Trigger,
  delay?:  number,   // ms — uniquement pour 'after-delay'
  action:  Action,
}): Interaction
```

Retourne l'objet `Interaction` créé. Appeler `.remove()` dessus pour
le supprimer ultérieurement.

---

## Triggers

```typescript
type Trigger = 'click' | 'mouse-enter' | 'mouse-leave' | 'after-delay'
```

| Trigger | Utilisation |
|---------|-------------|
| `'click'` | Navigation, ouverture modal, toggle |
| `'mouse-enter'` | Tooltip, hover state |
| `'mouse-leave'` | Fermeture tooltip |
| `'after-delay'` | Splash screen, autoplay, auto-dismiss |

---

## Actions

### NavigateTo

```typescript
{
  type:                    'navigate-to',
  destination:             Board,          // board cible (obligatoire)
  preserveScrollPosition?: boolean,        // défaut false
  animation?:              Animation,
}
```

### OpenOverlay

```typescript
{
  type:                  'open-overlay',
  destination:           Board,
  position?:             OverlayPosition,  // défaut 'center'
  manualPositionLocation?: { x: number, y: number }, // si position='manual'
  relativeTo?:           Shape,            // positionnement relatif à un shape
  closeWhenClickOutside?: boolean,
  addBackgroundOverlay?:  boolean,         // fond noir 20% d'opacité
  animation?:            Animation,
}
```

### ToggleOverlay

Mêmes paramètres que `OpenOverlay` avec `type: 'toggle-overlay'`.

### CloseOverlay

```typescript
{
  type:         'close-overlay',
  destination?: Board,  // null ou absent = ferme l'overlay courant (self)
}
```

### PreviousScreen

```typescript
{ type: 'previous-screen' }
```
Retourne à l'écran précédent dans l'historique de navigation.

### OpenUrl

```typescript
{
  type: 'open-url',
  url:  string,  // ouvre dans un nouvel onglet
}
```

---

## Positions d'overlay

```typescript
type OverlayPosition =
  | 'center'
  | 'top-left'  | 'top-center'    | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'manual'
```

Pour `'manual'` : fournir `manualPositionLocation: { x, y }` en coordonnées absolues.

---

## Animations

### Dissolve

```typescript
{
  type:     'dissolve',
  duration: number,               // ms (100–1000 recommandé)
  easing?:  EasingType,           // défaut 'linear'
}
```

### Slide

```typescript
{
  type:          'slide',
  way:           'in' | 'out',
  direction:     'left' | 'right' | 'up' | 'down',
  duration:      number,
  offsetEffect?: boolean,         // effet parallaxe (défaut false)
  easing?:       EasingType,
}
```

### Push

```typescript
{
  type:      'push',
  direction: 'left' | 'right' | 'up' | 'down',
  duration:  number,
  easing?:   EasingType,
}
```

### Easing

```typescript
type EasingType =
  'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
```

---

## Valeurs recommandées par contexte

| Contexte | duration | easing |
|----------|----------|--------|
| Navigation principale | 300ms | ease-in-out |
| Modal | 200ms | ease-out |
| Tooltip | 150ms | ease-out |
| Splash / onboarding | 400ms | ease-in-out |
| Drawer | 300ms | ease-in-out |
| Autoplay after-delay | — | — |

---

## Gestion des interactions existantes

```javascript
// Lire les interactions d'un shape
const interactions = shape.interactions ?? [];
interactions.forEach(inter => {
  console.log(inter.trigger, inter.action?.type);
});

// Supprimer une interaction
interactions[0]?.remove();

// Supprimer toutes les interactions
[...(shape.interactions ?? [])].forEach(i => i.remove());
```

---

## Flows (penpot.createFlow)

```javascript
// Créer un flow nommé depuis un board de départ
const flow = penpot.createFlow('Onboarding Flow', startBoard);
// Penpot gère ensuite la navigation via les interactions addInteraction
```

---

## Gotchas connus

- `shape.interactions` peut être `undefined` → toujours utiliser `?? []`
- `addInteraction` sur un shape sans `type === 'frame' | 'board'` peut
  échouer silencieusement selon la version
- L'ordre des interactions sur un même shape est l'ordre d'ajout
- `'after-delay'` sans `delay` défini → comportement non garanti (mettre 0)
- `close-overlay` sans `destination` ferme l'overlay le plus récent
