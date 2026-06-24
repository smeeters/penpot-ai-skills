# Installation — penpot-prototype-flows

## 1. Copier dans le kit

```bash
cp -r ~/Downloads/penpot-prototype-flows ~/.penpot-ai-kit/skills/penpot-prototype-flows
```

## 2. Enregistrer dans skills.json

```json
{
  "id": "penpot-prototype-flows",
  "name": "penpot-prototype-flows",
  "version": "0.1.0",
  "path": "skills/penpot-prototype-flows/SKILL.md",
  "mode": "review",
  "audiences": ["design-system", "product-designer", "design-engineer"],
  "description": "Crée des flows et interactions Penpot : navigate-to, overlays, after-delay, animations (Dissolve/Slide/Push). Audit des interactions existantes. Génère des flows linéaires depuis une liste d'écrans."
}
```

## 3. Usage

```
"Câble ces écrans en flow linéaire avec Slide left."
"Ajoute un overlay Modal/Confirmation sur ce bouton."
"After-delay 2s → navigate vers Home depuis ce splash."
"Audite les interactions de cette page."
"Montre-moi un tooltip sur hover pour cette icône info."
```

## 4. Structure

```
penpot-prototype-flows/
├── SKILL.md
├── INSTALL.md
├── scripts/
│   ├── create-linear-flow.js   ← N boards → flow click→next
│   ├── add-overlays.js         ← mapping déclaratif → overlays câblés
│   └── audit-interactions.js   ← inventaire interactions page courante
└── references/
    ├── interaction-api.md      ← référence complète API (triggers/actions/anims)
    └── plugin-api-gotchas.md
```

---

## Configuration MCP — Multi-agents

### Penpot local

**Claude Code**
```bash
claude mcp add penpot -t http http://localhost:4401/mcp
```

**Cursor**
```json
// .cursor/mcp.json
{ "mcpServers": { "penpot": { "url": "http://localhost:4401/sse" } } }
```

**VS Code Copilot**
```json
// settings.json — clé "mcp.servers" (pas "mcpServers")
{ "mcp": { "servers": { "penpot": { "url": "http://localhost:4401/sse" } } } }
```

**Claude Desktop**
```json
{
  "mcpServers": {
    "penpot": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:4401/sse", "--allow-http"]
    }
  }
}
```
