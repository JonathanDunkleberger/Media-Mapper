// Modern flat ESLint config baseline (user-provided template)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

// Custom rule to forbid raw '/api/' literals; must use helpers
const noRawApiRule = {
  meta: { type: 'problem', docs: { description: 'Disallow raw /api/ string literals' }, schema: [] },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (node.value.startsWith('/api/')) {
          context.report({ node, message: 'Use apiUrl()/helpers instead of hardcoding /api/ paths.' });
        }
      }
    };
  }
};

export default [
  // Ignore build artifacts
  { ignores: ['**/node_modules', '.next', 'dist', 'coverage'] },

  // Base JS/TS recommendations
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Include Next recommended flat config for proper detection
  nextPlugin.flatConfig.recommended,

  // Base rules applied to source files
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react': react,
      'no-raw-api': { rules: { 'no-raw-api': noRawApiRule } }
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { projectService: true }
    },
    rules: {
      // Core JS tweaks
      'no-console': 'warn',
      'no-unused-vars': 'off',
      'no-empty': 'off',

      // TS adjustments (rely on TS compiler)
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',

      // React / Next
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Custom bans
      'no-raw-api/no-raw-api': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: "MemberExpression[object.name='process'][property.name='env']", message: 'Use env modules; direct process.env access is restricted.' }
      ]
    }
  },
  // Allow /api literals inside API route handlers & internal helpers
  { files: ['src/app/api/**','src/lib/api-base.ts','src/lib/api/**','src/lib/http/**','src/lib/query.ts','src/lib/client.ts'], rules: { 'no-raw-api/no-raw-api': 'off' } },
  // Allow process.env only in env definition modules
  { files: ['src/lib/env*.ts'], rules: { 'no-restricted-syntax': 'off' } }
  ,
  // Guard against importing server-only modules in client components/hooks/pages
  {
    files: ['src/components/**/*.{ts,tsx}','src/app/**/*.{ts,tsx}'],
    ignores: ['src/app/api/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['@/lib/env.server'], message: 'Do not import server env in client code.' },
          { group: ['@/lib/*.server'], message: 'Do not import *.server.ts from client code.' },
          { group: ['**/*.server'], message: 'Do not import *.server.ts from client code.' }
        ]
      }]
    }
  }
];
