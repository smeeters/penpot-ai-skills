# Installation — penpot-screen-builder

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-screen-builder ~/.penpot-ai-kit/skills/penpot-screen-builder
```

## 2. Enregistrer dans skills.json

```json
{
  "id": "penpot-screen-builder",
  "name": "penpot-screen-builder",
  "version": "0.1.0",
  "path": "skills/penpot-screen-builder/SKILL.md",
  "mode": "review",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Construit un écran on-system complet depuis une structure de données JSON. Instancie exclusivement les composants du manifest library-mapper, applique les tokens, valide avec qa-checklist."
}
```

## 3. Prérequis

```
□ Manifest library-mapper disponible (penpot-library-mapper CATALOG)
□ Tokens 02-Semantic existants (penpot-token-pipeline BOOTSTRAP ou EXTRACT)
```

## 4. Usage

```
"Construis le formulaire depuis ce JSON : { name, email, role, active }"
"Génère la page de liste pour cette réponse API."
"Crée l'écran dashboard depuis ces métriques."
```

Procédure automatique :
1. parse-schema.js → mapping champ/composant + CHECKPOINT 1
2. build-screen.js → construction → CHECKPOINT 2
3. penpot-token-pipeline APPLY → tokens liés
4. penpot-qa-checklist → score ≥ 80/100
5. penpot-annotation → handoff prêt

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
penpot-screen-builder/
├── SKILL.md
├── INSTALL.md
├── scripts/
│   ├── parse-schema.js       ← STEP 1 : JSON → mapping
│   └── build-screen.js       ← STEP 2 : mapping → Penpot
├── templates/
│   ├── form-schema.json      ← exemple formulaire
│   └── list-schema.json      ← exemple liste
└── references/
    ├── layout-patterns.md    ← specs 4 patterns
    └── plugin-api-gotchas.md
```
