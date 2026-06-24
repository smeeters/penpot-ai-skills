/**
 * FONT SAFETY — Module partagé
 * Gestion sécurisée des polices dans les scripts execute_code Penpot.
 *
 * Contraintes connues (ar27111994/penpot-mcp + issue #8520) :
 *  - Pas d'API getInstalledFonts() dans le plugin API
 *  - fontId périmé : ne pas stocker un fontId entre sessions
 *  - fontFamily = 'Roboto Mono' peut échouer si non installée
 *  - fontWeight = '600' non supporté avec certaines polices → utiliser 700
 *  - Valeurs sûres : fontWeight 400 / 500 / 700 uniquement
 *
 * Usage : coller ce bloc en tête de tout script créant des textes.
 */

// ─── Polices de fallback ─────────────────────────────────────────────────────
// ⚠️ 'Source Sans Pro' NON garantie dans toutes les instances Penpot
//    (non disponible dans certains fichiers MUI)
// Polices confirmées disponibles (test terrain 18/06/2026) :
//   Roboto ✅ | Roboto Mono ✅ | Inter ✅
// Polices NON garanties : Source Sans Pro ❌
const SAFE_FONTS = {
  sansSerif:    'Roboto',       // ✅ disponible dans les fichiers MUI
  mono:         'Roboto Mono',  // ✅ disponible
  monoFallback: 'Courier New',  // police système — toujours disponible
};

// ─── Détection pragmatique de disponibilité ───────────────────────────────────
// Penpot n'expose pas getInstalledFonts() — on teste en créant
// un text shape temporaire et en lisant fontFamily après assignation.
function isFontAvailable(fontFamily) {
  try {
    const test = penpot.createText('.');
    test.fontFamily = fontFamily;
    const ok = test.fontFamily === fontFamily;
    // Supprimer le texte de test (si possible)
    try { penpot.currentPage.root.removeChild(test); } catch(e) {}
    return ok;
  } catch(e) {
    return false;
  }
}

// ─── Application sécurisée d'une police ──────────────────────────────────────
function setFontSafe(shape, fontFamily, fallback = SAFE_FONTS.sansSerif) {
  try {
    shape.fontFamily = fontFamily;
    // Vérifier que la police a été acceptée
    if (shape.fontFamily !== fontFamily) {
      shape.fontFamily = fallback;
      console.warn(`⚠️ Police "${fontFamily}" non disponible — fallback "${fallback}"`);
    }
  } catch(e) {
    try { shape.fontFamily = fallback; } catch(e2) { /* ignorer */ }
  }
}

// ─── Valeurs sûres de fontWeight ─────────────────────────────────────────────
// API-3 : seules 400 / 500 / 700 sont fiables avec toutes les polices
const FONT_WEIGHT = {
  regular:   400,
  medium:    500,
  bold:      700,
  // '600' et '300' peuvent échouer silencieusement → ne pas utiliser
};

// ─── Création sécurisée d'un text shape ──────────────────────────────────────
function createTextSafe(content, options = {}) {
  const {
    fontFamily  = SAFE_FONTS.sansSerif,
    fontFallback = SAFE_FONTS.sansSerif,
    fontSize    = 14,
    fontWeight  = FONT_WEIGHT.regular,
    color       = '#ffffff',
  } = options;

  const shape = penpot.createText(content ?? ' '); // API-4 : pas de ''
  setFontSafe(shape, fontFamily, fontFallback);
  shape.fontSize   = fontSize;
  shape.fontWeight = fontWeight; // 400 / 500 / 700 uniquement
  shape.fills      = [{ color }];
  return shape;
}
