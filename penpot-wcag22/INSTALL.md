# Installation — penpot-wcag22 skill

## 1. Copier le dossier dans le kit

```bash
cp -r ~/Downloads/penpot-wcag22-skill ~/.penpot-ai-kit/skills/penpot-wcag22
```

## 2. Enregistrer dans skills.json

```bash
# Ouvrir le fichier
nano ~/.penpot-ai-kit/skills.json
```

Ajouter dans le tableau `"skills"` :

```json
{
  "id": "penpot-wcag22",
  "name": "penpot-wcag22",
  "version": "0.1.0",
  "path": "skills/penpot-wcag22/SKILL.md",
  "mode": "suggest",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "WCAG 2.2 Level AA audit resource: contrast ratios, target sizes, focus indicators, and the 6 new 2.2 criteria."
}
```

## 3. Enregistrer dans l'index de découverte

```bash
nano ~/.penpot-ai-kit/.well-known/agent-skills/index.json
```

Ajouter la même entrée que ci-dessus.

## 4. Vérifier

```bash
cat ~/.penpot-ai-kit/skills.json | python3 -m json.tool | grep penpot-wcag22
```

## 5. Utilisation dans Claude Desktop

```
Lis AGENTS.md.
Ensuite charge skills/penpot-wcag22/SKILL.md et audite ce frame pour WCAG 2.2 AA.
```

Ou directement :
```
Vérifie le contraste de ce composant Button — utilise le skill penpot-wcag22.
```

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

## Structure installée

```
~/.penpot-ai-kit/skills/penpot-wcag22/
├── SKILL.md                          ← skill principal (chargé par l'agent)
├── references/
│   └── wcag22-reference.md           ← aide-mémoire 6 nouveaux critères 2.2
└── scripts/
    ├── contrast-checker.js           ← execute_code prêt à l'emploi
    └── target-size-checker.js        ← execute_code prêt à l'emploi
```
