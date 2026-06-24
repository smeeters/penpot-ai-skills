/**
 * WCAG 2.2 — 2.5.8 Target Size (Minimum) Checker
 * Audits interactive elements for minimum 24×24px (AA) and 44×44px (AAA).
 * 
 * Usage: paste into penpot:execute_code
 * Scope: current selection, or full page if nothing selected.
 */

const AA_MIN  = 24;  // WCAG 2.5.8 Level AA
const AAA_MIN = 44;  // WCAG 2.5.5 Level AAA (recommended)

// Heuristic: find interactive elements by name pattern
const INTERACTIVE_PATTERN = /button|btn|icon|link|cta|toggle|checkbox|radio|tab|chip|fab|action/i;

const scope = penpot.selection.length > 0
  ? penpot.selection
  : penpotUtils.findShapes(penpot.currentPage, { name: INTERACTIVE_PATTERN });

const results = [];

scope.forEach(shape => {
  const w = Math.round(shape.width  ?? 0);
  const h = Math.round(shape.height ?? 0);

  const passAA  = w >= AA_MIN  && h >= AA_MIN;
  const passAAA = w >= AAA_MIN && h >= AAA_MIN;

  results.push({
    name:    shape.name,
    width:   `${w}px`,
    height:  `${h}px`,
    AA:      passAA  ? '✅' : `❌ (need ${AA_MIN}px)`,
    AAA:     passAAA ? '✅' : `⚠️  (need ${AAA_MIN}px)`,
  });
});

console.table(results);

const aaFails = results.filter(r => r.AA.includes('❌'));
console.log(`\n${results.length} interactive elements — ${aaFails.length} AA failures`);
if (aaFails.length > 0) {
  console.log('Fix required (< 24px):');
  aaFails.forEach(f => console.log(`  • ${f.name}: ${f.width} × ${f.height}`));
}
