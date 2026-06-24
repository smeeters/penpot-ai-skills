# Installation — penpot-annotation

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-annotation ~/.penpot-ai-kit/skills/penpot-annotation
```

## 2. Enregistrer dans skills.json

```json
{
  "id": "penpot-annotation",
  "name": "penpot-annotation",
  "version": "0.1.0",
  "path": "skills/penpot-annotation/SKILL.md",
  "mode": "review",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Génère un board [Annotations] de handoff : noms de tokens sur chaque propriété, flags valeurs hardcodées, espacements, composants. Lecture seule — ne modifie pas le design."
}
```

## 3. Usage

```
"Annote ce frame pour le handoff."
"Prépare les specs dev du composant Button."
"Ajoute les annotations tokens sur cette page."
"Supprime les annotations." (MODE = 'CLEAN')
```

## 4. Synergie avec les autres skills

```
penpot-token-pipeline   → APPLY d'abord pour maximiser les tokens détectés
penpot-qa-checklist     → QA d'abord pour corriger les hardcodés avant annotation
penpot-library-mapper   → manifest pour enrichir les noms de composants
```

**Ordre recommandé avant handoff :**
1. `penpot-qa-checklist` → corriger les ❌
2. `penpot-token-pipeline APPLY` → lier les tokens manquants
3. `penpot-annotation` → générer le board handoff
4. Partager avec le dev

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
penpot-annotation/
├── SKILL.md
├── INSTALL.md
├── scripts/
│   ├── annotate-frame.js       ← génération (MODE = 'ANNOTATE')
│   └── clean-annotations.js    ← suppression (MODE = 'CLEAN')
└── references/
    ├── annotation-style-guide.md
    └── plugin-api-gotchas.md
```
