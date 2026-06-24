# penpot-ai-skills

> 10 production-validated AI skills for [Penpot](https://penpot.app) — built and tested on a real design system with 2,740 components and 1,116 tokens.

A collection of custom skills for the [penpot-ai-kit](https://github.com/penpot/penpot-ai-kit) framework, extending Claude Code with design system automation capabilities: token management, WCAG auditing, component library cataloging, screen building, responsive variants, developer handoff, and prototype flows.

All skills were developed and validated on Penpot 2.15.4 (self-hosted) with a MaterialUI v5.4 Dark library and a Tokens Studio token set. Every script reflects real production behavior, including 32 documented Plugin API quirks that aren't in the official docs.

---

## Requirements

- Penpot 2.14+ (self-hosted or cloud)
- [penpot-ai-kit](https://github.com/penpot/penpot-ai-kit) installed and configured
- Claude Code in VS Code connected via MCP server
- Node.js 18+

---

## Installation

```bash
# Clone the repo
git clone https://github.com/smeeters/penpot-ai-skills.git
cd penpot-ai-skills

# Copy skills to your local kit
cp -r skills/* ~/.penpot-ai-kit/skills/
```

Then register each skill in your `~/.penpot-ai-kit/skills.json` — refer to each skill's `INSTALL.md` for the exact entry to add.

---

## Skills

### `penpot-wcag22` — Accessibility audit
Audits color contrast across an entire frame using the exact sRGB luminance formula (WCAG 2.2 Level AA). Reports pass/fail per layer with contrast ratios, flags text under 4.5:1 and UI components under 3:1. Also checks interactive target sizes (minimum 24×24px).

### `penpot-token-pipeline` — Design token management
Bootstraps a 3-level token architecture (Foundation → Semantic → Component) directly in Penpot via the Tokens Studio plugin. Supports three modes: `BOOTSTRAP` (create the full structure from scratch), `EXTRACT` (read existing tokens from a file), and `APPLY` (map semantic tokens onto selected components).

Validated end-to-end: 57 Tokens Studio JSON files → 1,116 tokens → Style Dictionary v4 → 7 output files → Storybook 8.6.18 with Small/Medium/Large size switcher via `data-size`.

### `penpot-library-mapper` — Component library cataloging
Scans any component library and builds a structured manifest of all components, their variants, and properties. Persists the manifest using Penpot's native `pluginData` API so it survives session restarts. Library-agnostic — works with MUI, your own system, or any third-party library.

### `penpot-qa-checklist` — Pre-handoff quality audit
Runs a scored audit (/100) across 6 weighted families: naming conventions, auto-layout consistency, token coverage, text styles, component integrity, and layer structure. Generates a QA report frame directly in the file with actionable findings per category.

### `penpot-annotation` — Developer handoff board
Generates a structured handoff board from a selected frame: color-coded token labels, spacing annotations, component references, and interaction notes. Output is a dedicated annotation layer that sits alongside the design without modifying it.

### `penpot-screen-builder` — JSON to Penpot screen
Builds complete screens from a JSON schema using proper auto-layout boards (not flat rectangles). Supports form layouts, list patterns, and custom compositions. Resolves components from the connected library and applies semantic tokens automatically.

### `penpot-responsive-variants` — Desktop to mobile/tablet
Generates Mobile (375px) and Tablet (768px) variants from a desktop frame. Applies reflow rules: stack horizontal groups vertically, adjust font sizes, collapse navigation patterns. Variants are created as separate frames on the same page.

### `penpot-content-generator` — Content replacement
Replaces lorem ipsum placeholder text with realistic content from a structured corpus (UI labels, form fields, error messages, names, dates, prices). Also generates 12 edge-case frames for stress-testing layouts: long strings, empty states, RTL text, emoji, numbers.

### `penpot-design-tokens-dtcg` — Token export pipeline
Consolidates multi-file Tokens Studio exports into a single W3C DTCG-compliant JSON, then runs Style Dictionary v4 to produce CSS custom properties, JS/TS tokens, and a Storybook-ready theme file. Includes a `storybook-integration.md` guide for wiring the output.

### `penpot-prototype-flows` — Interactions and animations
Wires prototype flows using Penpot's full `addInteraction` API: navigate, overlay, scroll-to, back. Supports triggers (click, hover, after-delay), easing curves, and animation types (slide, dissolve, push). Also includes an interaction audit script that lists all existing interactions in a file.

---

## Shared resources

The `shared/` folder contains resources used across all skills:

- **`plugin-api-gotchas.md`** — 32 documented Penpot Plugin API quirks with a 36-point pre-flight checklist. Required reading before writing any plugin script.
- **`font-safety.js`** — `setFontSafe()` helper that gracefully falls back to Roboto when a font is unavailable (Source Sans Pro is not available in MUI files; `fontWeight: 600` fails silently).
- **`MCP-CONFIG.md`** — MCP server configuration for Claude Code, Cursor, VS Code Copilot, and Claude Desktop.

---

## Key Plugin API discoveries

These aren't in the official docs. Each one cost real debugging time:

- `page.children` always returns an empty array — use `page.root.children`
- `board.flex` must be read *after* `addFlexLayout()`, never before
- `verticalSizing = 'auto'` throws — calculate height manually
- Correct fills format: `{ fillColor: '#...', fillOpacity: 1 }` — `{ color: '#...' }` is silently ignored
- Penpot normalizes slashes in names: `Dialog/Confirmation` → `Dialog / Confirmation`
- `swapComponent` is in the docs but absent at runtime
- `componentId` is not exposed — use `/\//.test(shape.name)` as a heuristic

Full list in `shared/plugin-api-gotchas.md`.

---

## Environment

Developed and tested on:

- Penpot 2.15.4 (self-hosted via Docker)
- MaterialUI v5.4 Dark (2,740 components)
- Tokens Studio with 59 token sets / 1,116 tokens
- Style Dictionary v4
- Storybook 8.6.18
- Claude Code in VS Code via MCP server (`localhost:4401`)

---

## License

MIT — free to use, modify, and share.

---

## Contributing

Issues and PRs welcome. If you discover a new Plugin API quirk, adding it to `shared/plugin-api-gotchas.md` with a reproduction case is the most valuable contribution you can make.
