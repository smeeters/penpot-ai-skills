# Installation — penpot-qa-checklist

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-qa-checklist ~/.penpot-ai-kit/skills/penpot-qa-checklist
```

## 2. Enregistrer dans skills.json

```bash
nano ~/.penpot-ai-kit/skills.json
```

```json
{
  "id": "penpot-qa-checklist",
  "name": "penpot-qa-checklist",
  "version": "0.1.0",
  "path": "skills/penpot-qa-checklist/SKILL.md",
  "mode": "suggest",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Audit qualité pre-handoff : tokenisation, grille 4px, hygiène des calques, intégrité des instances, complétude des états. Rapport scoré avec plan de correction priorisé routé vers les skills compétents."
}
```

Même entrée dans `~/.penpot-ai-kit/.well-known/agent-skills/index.json`.

## 3. Usage

```
"QA ce frame avant handoff."
"Vérifie la qualité de la page, profil strict."
"Juste le contrôle tokens sur cette sélection."
```

→ Rapport scoré /100 avec verdict (✅ ≥90 / 🟡 70-89 / 🔴 <70) et plan de
correction ordonné : rename → tokens → instances → re-run.

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
penpot-qa-checklist/
├── SKILL.md
├── INSTALL.md
├── references/
│   └── qa-rules.md          ← seuils ajustables, profils, règles détaillées
└── scripts/
    └── qa-audit.js          ← audit 6 familles + scoring (lecture seule)
```

## Synergie avec les autres skills

Ce skill ne corrige rien — il route :

| Finding | Skill de correction |
|---------|---------------------|
| Valeur hardcodée couverte par un token | penpot-token-pipeline (APPLY) |
| Valeur sans token | penpot-token-pipeline (EXTRACT) |
| Librairie sans tokens | penpot-token-pipeline (BOOTSTRAP) |
| Nom générique | penpot-rename-layers (kit) |
| Instance détachée / doublon custom | penpot-library-mapper |
| Contraste / target size | penpot-wcag22 |
| Texte de démo | penpot-content-generator (à venir) |
```
