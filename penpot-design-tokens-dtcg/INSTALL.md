# Installation — penpot-design-tokens-dtcg

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-design-tokens-dtcg ~/.penpot-ai-kit/skills/penpot-design-tokens-dtcg
```

## 2. Enregistrer dans skills.json

```json
{
  "id": "penpot-design-tokens-dtcg",
  "name": "penpot-design-tokens-dtcg",
  "version": "0.1.0",
  "path": "skills/penpot-design-tokens-dtcg/SKILL.md",
  "mode": "review",
  "audiences": ["design-engineer", "design-system"],
  "description": "Consolide l'export multi-fichiers Tokens Studio en JSON DTCG unique, puis génère CSS Custom Properties + ES Module JS via Style Dictionary v4. Cible : Storybook."
}
```

## 3. Setup du pipeline (une seule fois)

```bash
# Créer le dossier de travail
mkdir -p ~/token-pipeline/{tokens-export,tokens,dist}
cd ~/token-pipeline

# Copier les fichiers de config
cp config/package.json ./package.json
cp config/style-dictionary.config.js ./
cp scripts/consolidate.js ./scripts/

# Installer les dépendances
npm install
```

## 4. Usage à chaque release de design

```bash
# 1. Exporter depuis Penpot via Tokens Studio
#    Plugins > Tokens Studio > Export > Save to disk
#    → Dossier tokens-export/ (57 fichiers)

# 2. Copier l'export dans le dossier de travail
cp -r ~/Downloads/tokens-export/* ~/token-pipeline/tokens-export/

# 3. Lancer le pipeline complet
cd ~/token-pipeline
npm run tokens

# 4. Vérifier les sorties
ls dist/
# tokens.css  tokens.components.css  tokens.small.css
# tokens.medium.css  tokens.large.css  tokens.js  tokens.d.ts

# 5. Committer
git add dist/ && git commit -m "chore: update design tokens $(date +%Y-%m-%d)"
```

## 5. Structure du dossier de travail

```
~/token-pipeline/
├── package.json                      ← dépendances npm
├── style-dictionary.config.js        ← config SD v4
├── scripts/
│   └── consolidate.js                ← merger les 57 fichiers
├── tokens-export/                    ← export Penpot (57 fichiers)
├── tokens/
│   └── tokens.json                   ← fichier mergé (généré)
└── dist/                             ← sorties CSS + JS (générées)
    ├── tokens.css
    ├── tokens.components.css
    ├── tokens.small.css
    ├── tokens.medium.css
    ├── tokens.large.css
    ├── tokens.js
    └── tokens.d.ts
```

## 6. Intégration Storybook

Voir `references/storybook-integration.md` pour :
- Import des fichiers CSS dans `.storybook/preview.js`
- Switcher de résolution (Small/Medium/Large) via `data-size`
- Utilisation dans les composants (CSS vars, JS tokens)


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
