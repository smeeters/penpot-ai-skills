# WCAG 2.2 — New Criteria Quick Reference

> 6 criteria added in WCAG 2.2 (Sept 2023). All are in scope for AA audits.

---

## ⭐ 2.4.11 Focus Not Obscured (Minimum) — Level AA

**Rule**: When a UI component receives keyboard focus, it is not entirely hidden
by author-created content (e.g. sticky headers, cookie banners, chat widgets).

**Pass**: Focus indicator partially visible = OK at AA.  
**Fail**: Focus indicator completely hidden = failure.

**Fix in CSS**:
```css
.sticky-header { position: sticky; top: 0; height: 60px; }
main { scroll-padding-top: 70px; /* header height + 10px */ }
```

**Check in Penpot**: any sticky/fixed overlay (nav, footer, banner) that could
cover interactive elements below it when scrolling.

---

## ⭐ 2.5.7 Dragging Movements — Level AA

**Rule**: All functionality using dragging can be operated with a single pointer
without dragging (e.g. an up/down button instead of drag-to-reorder).

**Exceptions**: when dragging is essential (e.g. free-draw canvas).

**Fix pattern**: add arrow buttons / numeric inputs alongside every drag UI.

```html
<li draggable="true">
  Item 1
  <button aria-label="Move up">↑</button>
  <button aria-label="Move down">↓</button>
</li>
```

**Check in Penpot**: sliders, sortable lists, carousels, kanban boards,
range inputs — flag any that have no pointer-based alternative.

---

## ⭐ 2.5.8 Target Size (Minimum) — Level AA

**Rule**: The size of the target for pointer inputs is at least **24×24 CSS pixels**.

**Exceptions**: inline text links in running text; spacing (if offset from other
targets ≥ equivalent area of a 24px circle).

| Level | Size |
|-------|------|
| AA minimum | **24 × 24 px** |
| AAA recommended | **44 × 44 px** |

**Fix**: increase padding, not the visual element itself.
```css
.icon-btn { width: 16px; height: 16px; padding: 12px; /* target: 40×40 */ }
```

---

## ⭐ 3.2.6 Consistent Help — Level A

**Rule**: If a help mechanism (human contact, chat, FAQ, search) exists on
multiple pages, it appears in the **same relative order** in each page's content.

**Scope**: applies when the same mechanism exists across pages — not required to
add a mechanism.

**Check in Penpot**: compare nav/footer across pages in the file for consistent
ordering of help-related links.

---

## ⭐ 3.3.7 Redundant Entry — Level A

**Rule**: Information previously entered by the user is either:
- Auto-populated, or
- Available to select

**Exception**: re-entering passwords for security verification is allowed.

**Fix pattern**: pre-fill billing address from shipping address; pre-fill
repeat-email from email field.

**Check in Penpot**: multi-step form flows — flag any screen that repeats a
question already answered in a previous step.

---

## ⭐ 3.3.8 Accessible Authentication (Minimum) — Level AA

**Rule**: A cognitive function test (e.g. transcription CAPTCHA, solve a math
puzzle) must NOT be required to authenticate.

**Allowed**: 
- Object recognition ("select all images with a car") ✅
- Biometrics ✅
- Passkeys / WebAuthn ✅
- Copy-paste from a password manager ✅

**Forbidden**:
- "Type the characters shown in the image" ❌
- "Solve 7 + 3 = ?" ❌

**Check in Penpot**: any login / signup screen — flag text-transcription CAPTCHAs.

---

## Conformance Level Summary

```
Level A  (must):   1.1.1, 3.2.6 ⭐, 3.3.7 ⭐, + all pre-2.2 A criteria
Level AA (should): 1.4.3, 1.4.11, 2.4.7, 2.4.11 ⭐, 2.5.7 ⭐, 2.5.8 ⭐, 3.3.8 ⭐
Level AAA (may):   1.4.6, 2.4.13, 2.5.5, 3.3.9
```

Source: https://www.w3.org/TR/WCAG22/ via Context7 `websites/w3_tr_wcag22`
