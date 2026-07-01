# APPLY — pièges confirmés terrain (référence de débogage)

> Ce fichier documente le *pourquoi* et les procédures de récupération.
> Les règles courtes et impératives sont dans `WORKFLOW.md` §"APPLY —
> garde-fous terrain". Consulter ce fichier quand un symptôme précis
> apparaît.

---

## 1. `applyToken` est un toggle

### Symptôme
Après `shape.applyToken(token, ['fill'])`, le token attendu n'est pas là —
ou un token qui y était a disparu.

### Cause
`applyToken(token, [prop])` ne *pose* pas un token : il *bascule* sa
présence. Appelé sur un shape qui porte déjà exactement ce token, il le
retire. Appelé pour remplacer un token *différent*, le comportement n'est
pas garanti en un seul appel (parfois 2-3 appels nécessaires, parfois il
faut détacher l'ancien d'abord).

### Parade
```js
// Poser sans risque
if (shape.tokens?.fill !== token.name) shape.applyToken(token, ['fill']);

// Remplacer un token différent : appliquer, relire, réappliquer si besoin
penpot.selection = [shape];
token.applyToSelected(['fill']);
// relire dans un bloc suivant (cf. §4 asynchronisme) et confirmer
```

### Note
Modifier directement `shape.fills = [...]` ne casse PAS toujours la liaison
de token existante (comportement variable selon le type de shape et s'il
s'agit d'une instance de composant). Ne pas compter dessus pour "détacher".

---

## 2. Boards : `applyToken` échoue en silence

### Symptôme
Sur un frame/board, `applyToken` ou `applyToShapes` ne renvoie pas d'erreur
mais le token n'est jamais lié.

### Cause
Les méthodes `applyToken` / `applyToShapes` ne fonctionnent pas sur les
shapes `type === 'board'`. Aucune exception levée.

### Parade
```js
penpot.selection = [boardShape];
token.applyToSelected(['fill']);
// Un SECOND appel est très fréquemment nécessaire pour que la liaison
// soit réellement enregistrée (le 1er ne fait souvent que changer la
// couleur du fill sans poser le token).
```

### Piège dérivé : glissement de sélection
Après une erreur ou un timeout, `penpot.selection` peut pointer sur un
shape inattendu (ex. une `Ellipse` orpheline). Toujours re-résoudre le
shape cible par traversal depuis `currentPage.root` avant de réappliquer,
plutôt que de se fier à la sélection courante.

---

## 3. Texte vs icône vs board vide

### Symptôme
Un token `*.text.*` se retrouve sur une icône ; ou on tente de tokeniser
un board qui n'a aucune couleur visible.

### Cause
La résolution par couleur seule ne distingue pas le rôle. Une icône
(`path`) et un label (`text`) peuvent partager le même hex.

### Parade — classifier par `shape.type`
| type | rôle | token |
|------|------|-------|
| `text` | label | `*.text.*` |
| `path` / `vector` | icône | `*.icon.*` (créer si absent) |
| `board` avec `fills:[]` | conteneur | ignorer |
| `board` avec fill | surface | `*.bg.*` |

Créer le token icône même si sa couleur égale celle du texte : le rôle est
distinct et finira par diverger (ex. icône d'intent colorée vs label neutre
dans un Snackbar).

---

## 4. `applyToken` est asynchrone

### Symptôme
Relire `shape.tokens?.fill` juste après l'application renvoie l'ancien état.

### Cause
L'application est asynchrone côté plugin. La lecture synchrone immédiate
voit l'état pré-application.

### Parade
Vérifier dans un bloc `execute_code` SÉPARÉ (chaque bloc est une nouvelle
transaction), ou insérer `await new Promise(r => setTimeout(r, 200))` avant
relecture dans le même bloc.

---

## 5. Doublons à segments permutés

### Symptôme
Deux tokens coexistent pour le même rôle : `button.contained.primary.bg`
et `button.contained.bg.primary`. Aucune erreur n'a été levée à la création.

### Cause
Penpot n'a pas de notion de "rôle" : deux chemins distincts sont deux
tokens valides, même si sémantiquement identiques. Le coût n'apparaît
qu'ensuite, quand des shapes utilisent l'un et l'autre et qu'il faut tout
réconcilier (191 shapes migrés dans un cas réel).

### Parade
Avant tout `addToken`, chercher les permutations plausibles des segments :
```js
const segments = name.split('.');          // ['button','contained','primary','bg']
// générer quelques ré-ordonnancements des 2 derniers segments et vérifier
const alt = [...segments.slice(0,2), segments[3], segments[2]].join('.');
const exists = set.tokens.find(t => t.name === name || t.name === alt);
```
Toujours adopter la nomenclature MAJORITAIRE déjà présente dans le set
(ex. si 6 intents utilisent `bg.{intent}`, ne pas introduire `{intent}.bg`).

### Migration si le doublon existe déjà
1. Construire la table `ancien → canonique`.
2. Pour chaque shape portant l'ancien : `penpot.selection=[shape];
   canonical.applyToSelected([prop])`, par chunks de 10.
3. Vérifier 0 occurrence restante.
4. `oldToken.remove()`.

---

## 6. Conflits de chemin hiérarchique

### Symptôme
`addToken` échoue : un token existe déjà au chemin parent.

### Cause
Un nom enfant qui partage le préfixe d'un parent entre en collision :
`link.color` (token) puis `link.color.inherit` (enfant) — le segment
`color` est à la fois feuille et nœud.

### Parade
Noms plats : `link.inherit-color` au lieu de `link.color.inherit`. Vérifier
qu'aucun token existant n'est un préfixe strict du nouveau nom (et inverse)
avant création.

---

## 7. Timeouts sur gros composants

### Symptôme
`execute_code` coupe à 30s sur des composants à fort cardinal (Switch ~177
enfants, ButtonGroup, Radio ~176).

### Causes cumulées
- Traversal récursif profond (>4-5 niveaux).
- Trop de shapes traités par bloc (>10-15).
- `applyToSelected` enchaînés sans laisser respirer la transaction.

### Parades
- **Chunk = 10 shapes max** par bloc (pas 20-30).
- Travailler par index de board enfant : `for (let i=0;i<10;i++)
  apply(board.children[i])`.
- Le `storage` (fonctions de résolution, refs de tokens) est PERDU à chaque
  timeout. Le reconstruire en tête de chaque bloc après coupure, via
  `penpotUtils.findTokenByName()`.
- **Après timeout : auditer, ne pas réappliquer aveuglément.** La passe a
  très souvent réussi pour les shapes traités avant la coupure. Compter les
  shapes encore non liés AVANT de relancer, sinon on re-toggle (cf. §1) et
  on retire ce qui venait d'être posé.

### Pattern d'audit post-timeout
```js
function unbound(shape){
  const out=[];
  const f=shape.fills?.[0];
  if(f?.fillColor){
    const o=Math.round((f.fillOpacity??1)*1000)/1000;
    if(o>0 && !shape.tokens?.fill) out.push(f.fillColor+'|'+o);
  }
  shape.children?.forEach(c=>out.push(...unbound(c)));
  return out;
}
// si unbound() renvoie [] sur la plage traitée → la passe a réussi, avancer
```

---

## 8. Navigation de page

### Symptôme
`root.children` renvoie le contenu d'une autre page que celle visée ;
`openPage` par nom land sur la mauvaise page.

### Cause
La résolution par nom est non fiable (homonymes, espaces, emojis dans les
noms de page Astralan). L'état de page courant peut aussi se désynchroniser
après une erreur.

### Parade
- Toujours `openPage(pageId)` avec l'ID exact (récupéré depuis
  `penpot.currentFile.pages`).
- Re-vérifier `penpot.currentPage.name` juste après navigation.
- `page.children` renvoie vide → utiliser `page.root.children`.

---

## 9. Opacités d'overlay (hover / focus)

### Symptôme
Un overlay hover/focus coloré s'affiche en pleine opacité au lieu de sa
transparence (ex. `radio.hover.primary` rendu à 100% au lieu de 20%).

### Cause
Un token couleur ne porte PAS d'opacité : la transparence est portée par le
`fillOpacity` du shape. Lier le token couleur ne fixe pas l'opacité.

### Deux stratégies (choisir selon le besoin)
1. **Token fondation avec alpha intégré** (recommandé pour les overlays
   récurrents) : créer `color.{family}.500-a10/a20/a30` en `rgba(...)`,
   aliasé en sémantique (`color.{family}.hover` → a10, `.focused` → a30).
   Le shape hérite alors de l'alpha via le token.
2. **Opacité portée par le shape** : lier le token couleur plein puis
   forcer `shape.fills = [{ fillColor, fillOpacity: 0.2 }]`. À contrôler
   explicitement, sinon reste à 1.

### Note d'affichage
`token.resolvedValueString` n'affiche PAS l'alpha d'une valeur `rgba()`
(il tronque à l'hex). Ce n'est qu'une limite d'affichage : la valeur
stockée conserve bien la transparence. Ne pas "corriger" un token rgba sur
la foi du resolved tronqué.

---

## 10. Checklist de clôture d'un composant

Avant de déclarer un composant tokenisé :
- [ ] Audit `fills` ET `strokes` = 0 valeur hardcodée (hors couleurs canvas
      d'annotation, ex. `#7b61ff`, `#1976d2`, à exclure explicitement).
- [ ] Aucune icône (`path`) sur un token `*.text.*`.
- [ ] Aucun token à référence cassée (`resolvedValueString === ''`).
- [ ] Aucun doublon à segments permutés introduit.
- [ ] Overlays hover/focus à l'opacité voulue (pas 1).
