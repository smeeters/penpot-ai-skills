/**
 * TOKENS DTCG — STEP 2: STYLE DICTIONARY CONFIG
 * Transform tokens.json → CSS + JS/TS pour Storybook.
 *
 * Usage : npm run build:tokens
 * Dépendances : style-dictionary@4, @tokens-studio/sd-transforms
 *
 * Sorties :
 *   dist/tokens.css         ← CSS custom properties (base + Semantic)
 *   dist/tokens.small.css   ← surcharge Small/ (résolution NG-small)
 *   dist/tokens.medium.css  ← surcharge Medium/
 *   dist/tokens.large.css   ← surcharge Large/
 *   dist/tokens.js          ← ES Module
 *   dist/tokens.d.ts        ← TypeScript declarations
 */

import StyleDictionary from 'style-dictionary';
import { register, permutateThemes } from '@tokens-studio/sd-transforms';

// Enregistrer les transforms Tokens Studio
register(StyleDictionary);

// ─── Filtres par niveau ───────────────────────────────────────────────────────

const FILTERS = {
  fondation: token =>
    !token.name.startsWith('dark') &&
    !token.name.includes('button') &&
    !token.name.includes('chip') &&
    !token.name.includes('checkbox') &&
    !token.name.includes('select') &&
    !token.name.includes('switch') &&
    !token.name.includes('text-field') &&
    !token.name.includes('radio'),

  semantic: token => token.name.startsWith('dark'),

  componentBase: token =>
    ['button', 'chip', 'checkbox', 'radio-button', 'select',
     'switch', 'text-field', 'toggle-button', 'nav-button',
     'drawer', 'header-action', 'footer', 'dialog', 'link',
     'menu', 'multiline', 'snackbar', 'tab', 'tooltip'].some(c =>
      token.name.startsWith(c)
    ) && !token.name.includes('small') && !token.name.includes('medium')
      && !token.name.includes('large'),

  small:  token => token.name.includes('small.') || token.path[0] === 'small',
  medium: token => token.name.includes('medium.') || token.path[0] === 'medium',
  large:  token => token.name.includes('large.') || token.path[0] === 'large',
};

// ─── Config principale ────────────────────────────────────────────────────────

const config = {
  source: ['tokens/tokens.json'],

  preprocessors: ['tokens-studio'], // résolution des alias Tokens Studio

  platforms: {

    // ── CSS — Base (Fondation + Semantic) ──────────────────────────────────────
    css: {
      transformGroup: 'tokens-studio',
      transforms: [
        'ts/resolveMath',
        'ts/size/px',
        'ts/color/modifiers',
        'ts/typography/compose/shorthand',
        'name/kebab',
      ],
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.css',
          format: 'css/variables',
          filter: token => FILTERS.fondation(token) || FILTERS.semantic(token),
          options: {
            selector: ':root',
            outputReferences: true, // conserver les var() pour les aliases
            showFileHeader: true,
          },
        },
        {
          destination: 'tokens.components.css',
          format: 'css/variables',
          filter: FILTERS.componentBase,
          options: {
            selector: ':root',
            outputReferences: true,
          },
        },
      ],
    },

    // ── CSS — Résolution Small ────────────────────────────────────────────────
    cssSmall: {
      transformGroup: 'tokens-studio',
      transforms: ['ts/resolveMath', 'ts/size/px', 'name/kebab'],
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.small.css',
        format: 'css/variables',
        filter: FILTERS.small,
        options: { selector: ':root[data-size="small"], .size-small' },
      }],
    },

    // ── CSS — Résolution Medium ───────────────────────────────────────────────
    cssMedium: {
      transformGroup: 'tokens-studio',
      transforms: ['ts/resolveMath', 'ts/size/px', 'name/kebab'],
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.medium.css',
        format: 'css/variables',
        filter: FILTERS.medium,
        options: { selector: ':root[data-size="medium"], .size-medium' },
      }],
    },

    // ── CSS — Résolution Large ────────────────────────────────────────────────
    cssLarge: {
      transformGroup: 'tokens-studio',
      transforms: ['ts/resolveMath', 'ts/size/px', 'name/kebab'],
      buildPath: 'dist/',
      files: [{
        destination: 'tokens.large.css',
        format: 'css/variables',
        filter: FILTERS.large,
        options: { selector: ':root[data-size="large"], .size-large' },
      }],
    },

    // ── JavaScript ES Module ──────────────────────────────────────────────────
    js: {
      transformGroup: 'tokens-studio',
      transforms: [
        'ts/resolveMath',
        'ts/size/px',
        'ts/color/modifiers',
        'name/camel',
      ],
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.js',
          format: 'javascript/esm',
          options: { outputReferences: false }, // valeurs résolues en JS
        },
      ],
    },

    // ── TypeScript declarations ───────────────────────────────────────────────
    ts: {
      transformGroup: 'tokens-studio',
      transforms: ['name/camel'],
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.d.ts',
          format: 'typescript/module-declarations',
        },
      ],
    },
  },
};

// ─── Build ────────────────────────────────────────────────────────────────────

const sd = new StyleDictionary(config);

sd.buildAllPlatforms().then(() => {
  console.log('\n✅ Build terminé');
  console.log('Fichiers générés dans dist/ :');
  console.log('  tokens.css            ← Fondation + Semantic (CSS vars)');
  console.log('  tokens.components.css ← Composants Base (CSS vars)');
  console.log('  tokens.small.css      ← Résolution Small');
  console.log('  tokens.medium.css     ← Résolution Medium');
  console.log('  tokens.large.css      ← Résolution Large');
  console.log('  tokens.js             ← ES Module (valeurs résolues)');
  console.log('  tokens.d.ts           ← TypeScript declarations');
  console.log('\n📋 Intégration Storybook : voir references/storybook-integration.md');
}).catch(err => {
  console.error('❌ Erreur build :', err.message);
  process.exit(1);
});
