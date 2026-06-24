---
id: penpot-wcag22
name: penpot-wcag22
version: 0.1.0
mode: suggest
audiences: ["design-system", "product-designer", "design-engineer"]
description: >
  Audit Penpot designs against WCAG 2.2 Level AA. Checks contrast ratios,
  target sizes, focus indicators, and new 2.2 criteria. Triggers on:
  "check accessibility", "audit contrast", "wcag", "a11y", "focus",
  "target size", "accessible", "check colors".
source: https://context7.com/websites/w3_tr_wcag22
---

# penpot-wcag22 — WCAG 2.2 Accessibility Audit

> Reference resource for the `penpot-audit-accessibility` skill.
> Ground every accessibility check in the numeric thresholds defined here.
> Never approximate — use the exact ratios and formulas below.

---

## 1. Purpose

This skill audits a Penpot file or selection for WCAG 2.2 Level AA conformance.
It checks: color contrast, non-text contrast, target sizes, focus indicators,
and the four criteria new in WCAG 2.2.

It produces a structured report: pass / fail / warning per criterion, with the
actual measured value and the required threshold.

---

## 2. Token-Aware Brief Contract

Before any audit action, reframe the request as:

- **Context**: which page / frame / component is in scope
- **Objective**: full AA audit, or specific criterion (contrast only, etc.)
- **Inputs**: selected shapes, or entire page if nothing is selected
- **Constraints**: report only — never auto-fix without explicit approval
- **Acceptance Criteria**:
  - All AA criteria listed in §4 are checked
  - Each result is: criterion ID + name + measured value + threshold + pass/fail
  - New WCAG 2.2 criteria (§6) are always included

---

## 3. Preconditions

1. Call `high_level_overview` first.
2. Discover the current page with `penpotUtils.shapeStructure(penpot.currentPage, 2)`.
3. If nothing is selected, ask the user to confirm scope (full page or selection).
4. Load token values with `tokenOverview` before checking color tokens.

---

## 4. WCAG 2.2 Level AA — Complete Checklist

### Perceivable

| ID | Criterion | Level | Threshold |
|----|-----------|-------|-----------|
| 1.1.1 | Non-text Content | A | Text alternative on all images/icons |
| 1.4.3 | Contrast (Minimum) — normal text | AA | **4.5 : 1** |
| 1.4.3 | Contrast (Minimum) — large text (18pt / 14pt bold) | AA | **3.0 : 1** |
| 1.4.4 | Resize Text | AA | Text scales to 200% without loss |
| 1.4.10 | Reflow | AA | No horizontal scroll at 320 CSS px width |
| 1.4.11 | Non-text Contrast | AA | **3.0 : 1** (UI components, icons, focus rings) |
| 1.4.12 | Text Spacing | AA | No loss of content with adjusted spacing |
| 1.4.13 | Content on Hover or Focus | AA | Dismissible, hoverable, persistent |

### Operable

| ID | Criterion | Level | Threshold |
|----|-----------|-------|-----------|
| 2.1.1 | Keyboard | A | All interactive elements keyboard-reachable |
| 2.4.3 | Focus Order | A | Focus sequence is logical |
| 2.4.7 | Focus Visible | AA | Focus indicator visible |
| 2.4.11 | Focus Not Obscured (Minimum) ⭐ NEW 2.2 | AA | Focused element not entirely hidden by sticky UI |
| 2.5.3 | Label in Name | A | Visible label matches accessible name |
| 2.5.8 | Target Size (Minimum) ⭐ NEW 2.2 | AA | **24 × 24 CSS px** minimum |
| 2.5.7 | Dragging Movements ⭐ NEW 2.2 | AA | Single-pointer alternative for all drag gestures |

### Understandable

| ID | Criterion | Level | Threshold |
|----|-----------|-------|-----------|
| 3.2.6 | Consistent Help ⭐ NEW 2.2 | A | Help mechanisms in same relative order across pages |
| 3.3.1 | Error Identification | A | Errors identified in text |
| 3.3.2 | Labels or Instructions | A | Labels provided for inputs |
| 3.3.7 | Redundant Entry ⭐ NEW 2.2 | A | Previously entered info auto-populated |
| 3.3.8 | Accessible Authentication (Minimum) ⭐ NEW 2.2 | AA | No cognitive tests (transcription CAPTCHA) for auth |

### Robust

| ID | Criterion | Level | Threshold |
|----|-----------|-------|-----------|
| 4.1.2 | Name, Role, Value | A | All UI components have accessible names |
| 4.1.3 | Status Messages | AA | Status messages programmatically determined |

---

## 5. Contrast — Exact Formulas

### Relative Luminance (sRGB)

```javascript
// Use this exact algorithm in execute_code when measuring Penpot fill colors
function toLinear(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r, g, b) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
```

### Pass/Fail Thresholds

| Text type | AA minimum | AAA minimum |
|-----------|-----------|-------------|
| Normal text (< 18pt / < 14pt bold) | **4.5 : 1** | 7.0 : 1 |
| Large text (≥ 18pt / ≥ 14pt bold) | **3.0 : 1** | 4.5 : 1 |
| UI components & icons (non-text) | **3.0 : 1** | — |
| Focus indicators | **3.0 : 1** vs adjacent colors | — |

### Reference color pairs

| Pair | Ratio | AA normal | AA large |
|------|-------|-----------|----------|
| #595959 on #fff | 4.51 : 1 | ✅ | ✅ |
| #767676 on #fff | 3.02 : 1 | ❌ | ✅ |
| #999999 on #fff | 2.50 : 1 | ❌ | ❌ |
| #4d4d4d on #fff | 7.02 : 1 | ✅ (AAA) | ✅ |
| #0078d4 on #fff | 4.54 : 1 | ✅ | ✅ |

---

## 6. New Criteria in WCAG 2.2 — Detail

### 2.5.8 Target Size (Minimum) — AA

- Minimum: **24 × 24 CSS px**
- Recommended: **44 × 44 CSS px** (AAA level 2.5.5)
- Exception: inline text links in a sentence (exempt)
- In Penpot: check `shape.width` and `shape.height` for all interactive elements.
  Add `padding` to reach target if element itself is smaller.

```css
/* AA minimum */
.icon-button { width: 24px; height: 24px; padding: 12px; }

/* AAA recommended */
.primary-button { min-width: 44px; min-height: 44px; }
```

### 2.4.11 Focus Not Obscured (Minimum) — AA

- Focused element must not be **entirely** hidden by a sticky/fixed component.
- Partially hidden is a warning, not a failure at AA.
- Full obscuring is a failure.
- Fix: `scroll-padding-top` equal to sticky header height + 10px safety margin.

```css
.sticky-header { position: sticky; top: 0; height: 60px; }
.main-content   { scroll-padding-top: 70px; }
```

### 2.5.7 Dragging Movements — AA

- Every drag gesture must have a **single-pointer alternative** (e.g. up/down buttons).
- Applies to: sortable lists, sliders, carousels, kanban boards.
- In Penpot: flag any drag-only interactive pattern without a button alternative.

### 3.3.7 Redundant Entry — A

- Previously entered information must be **auto-populated** or available to select.
- Exception: passwords and security-sensitive data may require re-entry.
- Flag multi-step forms where the same data is asked twice.

### 3.3.8 Accessible Authentication (Minimum) — AA

- No **cognitive function tests** (transcription CAPTCHA) for authentication.
- Allowed: object recognition (select images of cars), biometrics, passkeys.
- Flag any login screen with a text-transcription CAPTCHA.

### 3.2.6 Consistent Help — A

- Help mechanisms (search, contact, FAQ, chat) must appear in the **same relative order** across all pages.
- Flag navigation structures where help links change order between screens.

---

## 7. Focus Indicators

### AA requirements (2.4.7 + 2.4.11)

- Focus must be **visible** (any visible indicator).
- Must not be **entirely obscured** by other content.

### AAA requirements (2.4.13 — optional target)

- Indicator perimeter ≥ **2 CSS px** around the component.
- Indicator has ≥ **3 : 1** contrast against adjacent colors.

```css
/* AA safe — exceeds all requirements */
:focus-visible {
  outline: 3px solid #0078d4;   /* 3.5:1 against white */
  outline-offset: 2px;
}
```

---

## 8. Audit Steps in Penpot

### Step 1 — Discover shapes

```javascript
// execute_code
const page   = penpot.currentPage;
const shapes = penpotUtils.findShapes(page, { type: 'text' });
const allShapes = penpotUtils.shapeStructure(page, 3);
```

### Step 2 — Extract fill colors

```javascript
// execute_code
function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0,2), 16),
    g: parseInt(h.substring(2,4), 16),
    b: parseInt(h.substring(4,6), 16)
  };
}

// For a text shape:
const fill = shape.fills?.[0]?.color;       // e.g. "#595959"
const bg   = parentShape.fills?.[0]?.color; // e.g. "#ffffff"
```

### Step 3 — Calculate and classify

```javascript
// execute_code — inline the luminance functions from §5
const fg = hexToRGB(fill);
const bg = hexToRGB(background);
const ratio = contrastRatio(
  relativeLuminance(fg.r, fg.g, fg.b),
  relativeLuminance(bg.r, bg.g, bg.b)
);

const isLargeText = shape.fontSize >= 24 || (shape.fontSize >= 18.67 && shape.fontWeight >= 700);
const threshold   = isLargeText ? 3.0 : 4.5;
const pass        = ratio >= threshold;
```

### Step 4 — Check target sizes

```javascript
// execute_code
const interactive = penpotUtils.findShapes(page, { name: /button|icon|link|cta/i });
interactive.forEach(s => {
  const pass = s.width >= 24 && s.height >= 24;
  console.log(`${s.name}: ${s.width}×${s.height}px — ${pass ? '✅' : '❌ < 24px'}`);
});
```

### Step 5 — Export and checkpoint

After each criterion group, call `export_shape` on the audited frame and present
the result. Wait for approval before continuing.

---

## 9. Report Format

```
## WCAG 2.2 AA Audit — [Frame name] — [date]

### Contrast (1.4.3)
| Element | Foreground | Background | Ratio | Type | Result |
|---------|------------|------------|-------|------|--------|
| Body text | #595959 | #ffffff | 4.51:1 | Normal | ✅ AA |
| Caption   | #999999 | #ffffff | 2.50:1 | Normal | ❌ FAIL |

### Target Size (2.5.8)
| Element | Size | Result |
|---------|------|--------|
| Close button | 16×16px | ❌ FAIL (< 24px) |
| Submit button | 44×44px | ✅ AA |

### New WCAG 2.2 Criteria
| Criterion | Status | Note |
|-----------|--------|------|
| 2.4.11 Focus Not Obscured | ✅ | scroll-padding-top set |
| 2.5.7 Dragging Movements | ⚠️ | Sortable list has no button fallback |
| 3.3.7 Redundant Entry | ✅ | Billing auto-fills from shipping |
| 3.3.8 Accessible Auth | ✅ | No CAPTCHA found |
| 3.2.6 Consistent Help | N/A | Single-page scope |

### Summary
- ✅ Pass: X criteria
- ❌ Fail: Y criteria  
- ⚠️  Warning: Z criteria
- Recommended fixes: [list]
```

---

## 10. Anti-Rationalization Table

| Excuse | Countermeasure |
|--------|----------------|
| "The contrast looks fine visually." | Calculate the exact ratio. Visual judgment is unreliable at 3–5:1. |
| "That button is small but it's obvious what it does." | 24×24px is the AA floor regardless of visibility. Measure it. |
| "We'll fix focus styles before launch." | Focus is a gate, not a follow-up. Mark as fail now. |
| "WCAG 2.2 criteria are new, maybe optional." | 2.4.11, 2.5.7, 2.5.8, 3.3.7, 3.3.8, 3.2.6 are all in scope for AA. |
| "I'll estimate the ratio from the hex values." | Use the exact sRGB luminance formula from §5. Estimation fails near thresholds. |

---

## 11. References

- Source: `https://context7.com/websites/w3_tr_wcag22` (Context7 ID: `websites/w3_tr_wcag22`)
- W3C spec: `https://www.w3.org/TR/WCAG22/`
- Related kit skill: `skills/penpot-audit-accessibility/SKILL.md`
- `shared/plugin-api-gotchas.md` — Penpot API constraints
- `shared/penpot-mcp-tool-reference.md` — the 4 MCP tools
