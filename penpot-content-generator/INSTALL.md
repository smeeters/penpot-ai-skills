# Installation — penpot-content-generator

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-content-generator ~/.penpot-ai-kit/skills/penpot-content-generator
```

## 2. Enregistrer dans skills.json

```json
{
  "id": "penpot-content-generator",
  "name": "penpot-content-generator",
  "version": "0.1.0",
  "path": "skills/penpot-content-generator/SKILL.md",
  "mode": "suggest",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Remplace les textes de démo par du contenu fr-FR réaliste (FILL) et génère des variantes edge case (texte long, valeur nulle, caractères spéciaux) sans modifier le frame original (EDGE)."
}
```

## 3. Usage

```
Mode FILL :
"Remplace le Lorem ipsum par du contenu réaliste."
"Remplis les champs avec des données fr-FR."
"Ce frame a encore des textes de démo — nettoie-les."

Mode EDGE :
"Génère les cas limites pour ce frame."
"Teste avec un texte très long et une valeur nulle."
"Edge cases sur ce formulaire."
```

## 4. Couplage avec QA

```
penpot-qa-checklist  → QA-5 détecte les textes de démo
penpot-content-generator FILL → les remplace
penpot-qa-checklist  → re-run → QA-5 résolu
```

## 5. Structure

```
penpot-content-generator/
├── SKILL.md
├── INSTALL.md
├── data/
│   └── content-corpus.json      ← pool fr-FR par type sémantique
├── scripts/
│   ├── fill-content.js          ← FILL : remplacement des textes de démo
│   └── generate-edge-cases.js   ← EDGE : frames de cas limites
└── references/
    └── plugin-api-gotchas.md
```


---

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
