/**
 * PENPOT-ANNOTATION — CLEAN
 * Supprime le board [Annotations] de la page courante.
 * Le design sous-jacent est intact.
 *
 * Usage : coller dans penpot:execute_code sur la page concernée.
 */

const page = penpot.currentPage;
const annot = (page.root.children ?? []).find(s => s.name === '[Annotations]');

if (annot) {
  // ⚠️ page.root.removeChild() — pas page.removeChild() (bug session 1)
  page.root.removeChild(annot);
  console.log('✅ Board [Annotations] supprimé.');
} else {
  console.log('ℹ️ Aucun board [Annotations] trouvé sur cette page.');
  console.log('Pages disponibles :');
  (penpot.currentFile?.pages ?? []).forEach(p =>
    console.log(`  - ${p.name}`));
}
