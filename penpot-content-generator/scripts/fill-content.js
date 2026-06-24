/**
 * CONTENT GENERATOR — FILL
 * Remplace les textes de démo par du contenu fr-FR réaliste.
 * Inférence depuis le nom du calque et le contexte parent.
 *
 * Usage : sélectionner un frame ou laisser la page courante,
 *         coller dans execute_code.
 * Mode  : DRY_RUN par défaut — présente le plan avant remplacement.
 */

const DRY_RUN = true;     // ← false après validation du checkpoint
const RANDOMIZE = true;   // varier le contenu entre instances similaires

// ─── Corpus fr-FR ─────────────────────────────────────────────────────────────

const CORPUS = {
  'person-name':  ['Jean Dupont', 'Marie Leblanc', 'Ahmed Benali', 'Sophie Martin',
                   'Luc Girard', 'Fatima Ndiaye', 'Paul Rousseau', 'Clara Bernard'],
  'email':        ['jean.dupont@acme.fr', 'marie.leblanc@entreprise.com',
                   'contact@societe.fr', 'support@plateforme.io'],
  'phone':        ['+33 6 12 34 56 78', '+33 1 42 00 11 22', '+33 7 89 01 23 45'],
  'address':      ['12 rue de la Paix, 75001 Paris', '4 allée des Roses, 69003 Lyon',
                   '8 boulevard du Port, 13002 Marseille'],
  'city':         ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nantes', 'Toulouse'],
  'title':        ['Rapport trimestriel Q2 2026', 'Tableau de bord commercial',
                   'Analyse des performances', 'Synthèse mensuelle'],
  'description':  ['Solution complète pour optimiser vos processus métier.',
                   'Plateforme collaborative dédiée aux équipes design.',
                   'Outil de gestion avancé pour les professionnels.'],
  'price':        ['1 249,00 €', '89,90 €', '3 500,00 €', '149,99 €', '29,00 €'],
  'date':         ['14/06/2026', '01/01/2026', '31/12/2025', '15/03/2026'],
  'time':         ['14:30', '09:00', '17:45', '08:15'],
  'count':        ['42', '128', '7', '2 847', '0'],
  'percent':      ['73 %', '12 %', '98 %', '45 %'],
  'id':           ['USR-2847', 'ORD-00124', 'PRJ-456', 'TKT-9901'],
  'label':        ['En cours', 'Terminé', 'En attente', 'Annulé', 'Brouillon'],
  'status':       ['Actif', 'Inactif', 'Suspendu', 'En révision'],
  'company':      ['Acme SAS', 'TechCorp SARL', 'InnoDesign SA', 'DataFlow SAS'],
  'role':         ['Designer Senior', 'Chef de Projet', 'Développeur Full Stack',
                   'Directrice Marketing', 'Responsable Produit'],
  'message':      ['Votre demande a bien été prise en compte.',
                   'Modifications enregistrées avec succès.',
                   'Une erreur est survenue, veuillez réessayer.'],
  'body':         ['Ce paragraphe présente le contenu principal de la section avec ' +
                   'suffisamment de texte pour valider le layout sur deux lignes.',
                   'Description complète qui illustre le comportement du composant ' +
                   'avec un contenu représentatif de la production.'],
  'hint':         ['Saisissez votre adresse e-mail', 'Entrez votre nom complet',
                   'Rechercher...', 'JJ/MM/AAAA'],
  'action':       ['Enregistrer', 'Confirmer', 'Annuler', 'Suivant', 'Retour'],
  'heading':      ['Tableau de bord', 'Mon compte', 'Paramètres', 'Résultats'],
  'nav':          ['Accueil', 'Projets', 'Équipe', 'Rapports', 'Paramètres'],
  'error':        ['Ce champ est obligatoire.', 'Format invalide.',
                   'La valeur doit être positive.'],
  'success':      ['Modifications enregistrées.', 'Compte créé avec succès.',
                   'Fichier importé.'],
  'empty-state':  ['Aucun élément à afficher.', 'Aucun résultat pour cette recherche.',
                   'Commencez par créer un premier élément.'],
};

function getContent(type) {
  const pool = CORPUS[type] ?? CORPUS['body'];
  return RANDOMIZE
    ? pool[Math.floor(Math.random() * pool.length)]
    : pool[0];
}

// ─── Inférence du type depuis le nom de calque ────────────────────────────────

const TYPE_PATTERNS = [
  [/name|prénom|nom(?!bre)/i,     'person-name'],
  [/email|mail|courriel/i,        'email'],
  [/phone|tel|téléphone/i,        'phone'],
  [/address|adresse/i,            'address'],
  [/city|ville/i,                 'city'],
  [/title|titre/i,                'title'],
  [/desc(?:ription)?/i,           'description'],
  [/price|prix|montant|amount/i,  'price'],
  [/date|_at|created|updated/i,   'date'],
  [/time|heure/i,                 'time'],
  [/count|total|nb|nombre/i,      'count'],
  [/percent|taux|rate/i,          'percent'],
  [/\bid\b|ref|code/i,            'id'],
  [/label|tag|badge/i,            'label'],
  [/status|état|state/i,          'status'],
  [/company|société|entreprise/i, 'company'],
  [/role|poste|fonction/i,        'role'],
  [/message|comment/i,            'message'],
  [/body|content|contenu/i,       'body'],
  [/placeholder|hint/i,           'hint'],
  [/btn|button|cta|action/i,      'action'],
  [/h[1-6]|heading|header/i,      'heading'],
  [/nav|menu/i,                   'nav'],
  [/error|warning|erreur/i,       'error'],
  [/success|confirm/i,            'success'],
  [/empty|vide/i,                 'empty-state'],
];

function inferType(layerName, parentName = '') {
  const combined = `${layerName} ${parentName}`.toLowerCase();
  for (const [pattern, type] of TYPE_PATTERNS)
    if (pattern.test(combined)) return type;
  return 'body'; // fallback
}

// ─── Détection des textes à remplacer ────────────────────────────────────────

const PLACEHOLDER_PATTERNS = /^(lorem|ipsum|text|label|titre|title|value|valeur|name|nom|placeholder|button|btn|heading|caption|subtitle)$/i;
const LOREM_PATTERN = /^lorem\s+ipsum/i;

function shouldReplace(text) {
  if (!text || text.trim().length === 0) return true;
  const t = text.trim();
  if (LOREM_PATTERN.test(t)) return true;
  if (PLACEHOLDER_PATTERNS.test(t)) return true;
  if (t.length <= 2 && !/^[\d€%]/.test(t)) return true; // trop court sauf nombre
  return false;
}

// ─── Scan récursif ────────────────────────────────────────────────────────────

const plan = []; // {shape, layerName, parent, type, current, replacement}

function scan(shape, parentName = '') {
  if (shape.name === '[Annotations]') return; // ignorer le board d'annotations
  if (shape.type === 'text') {
    const current = shape.characters ?? '';
    if (shouldReplace(current)) {
      const type    = inferType(shape.name, parentName);
      const replacement = getContent(type);
      plan.push({ shape, layerName: shape.name, parent: parentName,
                  type, current: current.slice(0, 40), replacement });
    }
  }
  (shape.children ?? []).forEach(c => scan(c, shape.name));
}

const scope = penpot.selection.length > 0
  ? penpot.selection
  : (penpot.currentPage.root.children ?? []);

scope.forEach(s => scan(s));

// ─── Rapport / Checkpoint ────────────────────────────────────────────────────

console.log(`\n══════ CONTENT GENERATOR — FILL ══════`);
console.log(`${plan.length} textes à remplacer`);
console.table(plan.map(p => ({
  calque: p.layerName, parent: p.parent,
  type: p.type, actuel: p.current || '(vide)',
  remplacement: p.replacement,
})));

// ─── Remplacement ────────────────────────────────────────────────────────────

if (!DRY_RUN) {
  let replaced = 0;
  plan.forEach(p => {
    try {
      p.shape.characters = p.replacement;
      replaced++;
    } catch (e) {
      console.warn(`⚠️ Impossible de modifier "${p.layerName}" : ${e.message}`);
    }
  });
  console.log(`\n✅ ${replaced}/${plan.length} textes remplacés.`);
  if (plan.length - replaced > 0)
    console.warn(`⚠️ ${plan.length - replaced} échecs — instances non détachées ?`);
} else {
  console.log(`\n📋 DRY RUN — valider le plan puis passer DRY_RUN = false`);
}
