# Schéma du manifest — penpot-library-mapper/manifest-v1

> Un manifest par bibliothèque, persistant dans `manifests/<slug>-manifest.json`.
> Généré par `scripts/catalog-library.js`, consommé par
> `scripts/instantiate-component.js` et par l'agent en phase MAP.

## Structure

```json
{
  "$schema": "penpot-library-mapper/manifest-v1",
  "librarySlug": "materialui-v5-4-dark",
  "libraryName": "MaterialUI v5.4 Dark",
  "source": "local",
  "generatedAt": "2026-06-10T14:00:00.000Z",
  "componentCount": 42,
  "conventions": {
    "hierarchySeparator": "/",
    "groups": ["Button", "Inputs", "Navigation"],
    "detectedStateAxis": "state",
    "detectedSizeAxis": "size",
    "designSystem": "mui"
  },
  "components": [
    {
      "id": "ae31c2…",
      "name": "Outlined",
      "path": "Button",
      "fullName": "Button/Outlined",
      "width": 103,
      "height": 36,
      "variantCount": 15,
      "variantAxes": [
        { "index": 0, "axis": "state", "values": ["enabled", "hovered", "focused", "pressed", "disabled"] },
        { "index": 1, "axis": "size",  "values": ["sm", "md", "lg"] }
      ]
    }
  ]
}
```

## Champs critiques

| Champ | Rôle | Règle |
|-------|------|-------|
| `components[].id` | Résolution prioritaire à l'instanciation | Si introuvable → fallback `fullName`, sinon manifest périmé |
| `variantAxes[].index` | **Index positionnel pour `switchVariant(index, value)`** | Jamais réordonner ce tableau. Jamais deviner l'index. |
| `variantAxes[].values` | Validation des valeurs demandées | Valeur hors liste = erreur explicite, pas de tentative |
| `conventions.designSystem` | Active les synonymes spécifiques (specs.md §1) | `mui` \| `carbon` \| `atlassian` \| absent (sur mesure) |
| `generatedAt` | Détection de péremption | Bibliothèque modifiée après cette date → proposer re-CATALOG |

## Cycle de vie

```
CATALOG (scan) ──→ manifests/<slug>-manifest.json
                        │
        MAP & INSTANTIATE (sessions suivantes : pas de re-scan)
                        │
   Bibliothèque modifiée ? ──→ re-CATALOG (écrase le manifest)
```

## Persistance et mises à jour du kit

Les manifests sont des données utilisateur, pas du contenu du kit : si le
dossier du skill est écrasé par une mise à jour, sauvegarder `manifests/`
au préalable ou les stocker hors du kit avec chemin absolu référencé.
