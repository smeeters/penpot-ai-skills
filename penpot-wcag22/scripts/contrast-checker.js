/**
 * WCAG 2.2 Contrast Checker — execute_code template
 * Paste into penpot:execute_code to audit the current selection or page.
 * 
 * Returns a structured report: element name, fg, bg, ratio, pass/fail.
 */

// ─── Luminance helpers (WCAG 2.2 spec — exact formula) ────────────────────────

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

function hexToRGB(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function colorFromFill(fills) {
  return fills?.[0]?.color ?? null;
}

// ─── Classify text size ────────────────────────────────────────────────────────

function isLargeText(shape) {
  const size   = shape.fontSize  ?? 16;
  const weight = shape.fontWeight ?? 400;
  // 18pt ≈ 24px ; 14pt bold ≈ 18.67px bold
  return size >= 24 || (size >= 18.67 && weight >= 700);
}

// ─── Resolve background color ─────────────────────────────────────────────────

function resolveBackground(shape) {
  let current = shape.parent;
  while (current) {
    const bg = colorFromFill(current.fills);
    if (bg) return bg;
    current = current.parent;
  }
  return '#ffffff'; // default assumption
}

// ─── Main audit ───────────────────────────────────────────────────────────────

const scope  = penpot.selection.length > 0
  ? penpot.selection
  : penpotUtils.findShapes(penpot.currentPage, { type: 'text' });

const results = [];

scope.forEach(shape => {
  if (shape.type !== 'text') return;

  const fgHex = colorFromFill(shape.fills);
  const bgHex = resolveBackground(shape);
  if (!fgHex || !bgHex) return;

  const fg    = hexToRGB(fgHex);
  const bg    = hexToRGB(bgHex);
  const l1    = relativeLuminance(fg.r, fg.g, fg.b);
  const l2    = relativeLuminance(bg.r, bg.g, bg.b);
  const ratio = contrastRatio(l1, l2).toFixed(2);

  const large     = isLargeText(shape);
  const threshold = large ? 3.0 : 4.5;
  const pass      = parseFloat(ratio) >= threshold;

  results.push({
    name:      shape.name,
    fg:        fgHex,
    bg:        bgHex,
    ratio:     `${ratio}:1`,
    type:      large ? 'large' : 'normal',
    threshold: `${threshold}:1`,
    result:    pass ? '✅ PASS' : '❌ FAIL',
  });
});

// ─── Output ───────────────────────────────────────────────────────────────────

console.table(results);

const fails = results.filter(r => r.result.includes('FAIL'));
console.log(`\n${results.length} elements checked — ${fails.length} failures`);
if (fails.length > 0) {
  console.log('Failed elements:');
  fails.forEach(f => console.log(`  • ${f.name}: ${f.ratio} (need ${f.threshold})`));
}
