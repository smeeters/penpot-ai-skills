# Installation — penpot-token-pipeline

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-token-pipeline ~/.penpot-ai-kit/workflows/penpot-token-pipeline
```

> Les workflows multi-étapes vont dans `workflows/`, pas dans `skills/`
> (convention du kit : skills = recettes unitaires, workflows = orchestration).

## 2. Enregistrer dans skills.json

```bash
nano ~/.penpot-ai-kit/skills.json
```

```json
{
  "id": "penpot-token-pipeline",
  "name": "penpot-token-pipeline",
  "version": "0.1.0",
  "path": "workflows/penpot-token-pipeline/WORKFLOW.md",
  "mode": "review",
  "audiences": ["design-system", "design-engineer"],
  "description": "Pipeline bidirectionnel de tokens 3 niveaux (Fondation/Semantic/Component) : extraction depuis composants sélectionnés et application sur composants."
}
```

Même entrée dans `~/.penpot-ai-kit/.well-known/agent-skills/index.json`.

## 3. Utilisation

### Extraction (composant → tokens)
```
Sélectionne ton/tes composant(s) dans Penpot, puis :

"Extrais les tokens de ce composant — utilise penpot-token-pipeline.
 Résolution Small."
```
→ L'agent fait un DRY RUN, présente le plan de mapping (réutilisation /
créations / orphelins), attend ta validation, puis crée en batch.

### Application (tokens → composant)
```
"Applique les tokens du set Base/Button sur cette sélection —
 utilise penpot-token-pipeline, thème NG-small."
```
→ DRY RUN avec table de binding, vérification du nommage des calques,
demande d'approbation pour tout .detach(), puis application.

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
penpot-token-pipeline/
├── WORKFLOW.md                          ← orchestration complète
├── INSTALL.md
├── references/
│   └── tokens2026-architecture.md       ← contrat structurel de ta librairie
└── scripts/
    ├── extract-tokens.js                ← execute_code : EXTRACT
    └── apply-tokens.js                  ← execute_code : APPLY
```
