# Installation — penpot-responsive-variants

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-responsive-variants ~/.penpot-ai-kit/skills/penpot-responsive-variants
```

## 2. Enregistrer dans skills.json

```json
{
  "id": "penpot-responsive-variants",
  "name": "penpot-responsive-variants",
  "version": "0.1.0",
  "path": "skills/penpot-responsive-variants/SKILL.md",
  "mode": "review",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Génère les variantes mobile (375px) et tablet (768px) depuis un frame desktop. Applique les règles de reflow : flex-row→column, sidebar→bottom nav, grille adaptée, typographie fluide."
}
```

## 3. Usage

```
"Décline ce frame en mobile et tablet."
"Génère les breakpoints pour cette page."
"Version responsive de ce dashboard."
```

Procédure :
1. Sélectionner 1 frame desktop dans Penpot
2. Exécuter `generate-variants.js`
3. Valider les placeholders [Bottom Nav] et les tables
4. `penpot-qa-checklist` sur chaque variante

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
penpot-responsive-variants/
├── SKILL.md
├── INSTALL.md
├── scripts/
│   └── generate-variants.js     ← génération mobile + tablet
└── references/
    ├── reflow-rules.md           ← règles de transformation détaillées
    └── plugin-api-gotchas.md
```
