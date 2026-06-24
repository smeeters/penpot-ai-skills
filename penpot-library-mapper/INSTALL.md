# Installation — penpot-library-mapper

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-library-mapper ~/.penpot-ai-kit/skills/penpot-library-mapper
```

## 2. Enregistrer dans skills.json

```bash
nano ~/.penpot-ai-kit/skills.json
```

```json
{
  "id": "penpot-library-mapper",
  "name": "penpot-library-mapper",
  "version": "0.1.0",
  "path": "skills/penpot-library-mapper/SKILL.md",
  "mode": "review",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Catalogue toute bibliothèque de composants (Carbon, Atlassian, MUI, sur mesure) en manifest persistant et mappe les demandes en langage naturel vers les composants et variants existants."
}
```

Même entrée dans `~/.penpot-ai-kit/.well-known/agent-skills/index.json`.

## 3. Premier usage — cataloguer une bibliothèque

```
Ouvre le fichier Penpot contenant la bibliothèque, puis :

"Catalogue cette bibliothèque — utilise penpot-library-mapper."
```
→ L'agent exécute le scan, génère le manifest JSON, et te demande de le
sauvegarder dans `skills/penpot-library-mapper/manifests/<slug>-manifest.json`.

## 4. Usage quotidien

```
"Place un bouton secondaire en état hover à côté du formulaire."
"Instancie un ghost button Carbon, taille lg."
"Quel composant de ma bibliothèque correspond à un lozenge ?"
```
→ Résolution via manifest + table de synonymes, instanciation avec
`switchVariant` aux index exacts, jamais de substitut silencieux.

## Configuration MCP — Multi-agents

### Penpot local (recommandé pour développement)

**Claude Code (VS Code)**
```bash
# Dans le terminal VS Code, ajouter le serveur MCP
claude mcp add penpot -t http http://localhost:4401/mcp
```

Ou dans `.mcp.json` à la racine du projet :
```json
{
  "mcpServers": {
    "penpot": {
      "url": "http://localhost:4401/sse"
    }
  }
}
```

**Cursor**
```json
// .cursor/mcp.json
{
  "mcpServers": {
    "penpot": {
      "url": "http://localhost:4401/sse"
    }
  }
}
```

**VS Code Copilot**
```json
// settings.json
{
  "mcp": {
    "servers": {
      "penpot": {
        "url": "http://localhost:4401/sse"
      }
    }
  }
}
```
⚠️ Clé correcte : `"mcp.servers"` et non `"mcpServers"` dans VS Code Copilot.

**Claude Desktop**
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:4401/sse", "--allow-http"]
    }
  }
}
```

### Penpot remote (cloud ou serveur hébergé)

Remplacer `http://localhost:4401` par l'URL de ton serveur :

```bash
# Claude Code
claude mcp add penpot -t http https://ton-serveur.example.com:4401/mcp

# Démarrage via npx (dernière version stable)
npx @penpot/mcp@stable
```

### Vérification de la connexion

Dans Claude Code, tester immédiatement :
```
Appelle high_level_overview — si ça répond, le serveur est connecté.
```


---

## Structure

```
penpot-library-mapper/
├── SKILL.md
├── INSTALL.md
├── manifests/                       ← manifests générés (1 par bibliothèque)
├── references/
│   ├── design-system-specs.md       ← synonymes + specs MUI/Carbon/Atlassian
│   └── manifest-schema.md           ← format du manifest
└── scripts/
    ├── catalog-library.js           ← CATALOG : scan → manifest
    └── instantiate-component.js     ← MAP : résolution + instanciation
```

## ⚠️ Persistance des manifests

Les manifests sont TES données. Avant toute mise à jour du kit :
```bash
cp -r ~/.penpot-ai-kit/skills/penpot-library-mapper/manifests ~/penpot-manifests-backup
```
