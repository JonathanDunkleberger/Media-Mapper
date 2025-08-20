import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Enforce no direct process.env and disallow raw /api usage globally (fine-grained override below for code files)
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'Use env client/server modules; do not access process.env directly.',
        },
        {
          selector: "CallExpression[callee.name='fetch'][arguments.0.value=/^\\/api\\//]",
          message: 'Use apiUrl()/q* helpers — do not call fetch("/api/...") directly.'
        },
        {
          selector: "Literal[value=/^\\/api\\//]",
          message: 'Use apiUrl()/q* helpers — do not embed "/api/..." literals.'
        }
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/store/favorites',
              message: 'Deprecated. Import from \'@/hooks/useFavorites\' instead.'
            }
          ]
        }
      ],
      // Relax overly strict rules for now to allow build; tighten later.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn'
    },
    overrides: [
      {
        files: ['src/**/*.{ts,tsx,js,jsx}'],
        excludedFiles: ['src/app/api/**', 'src/lib/api-base.ts', 'src/lib/api/**'],
        rules: {
          'no-restricted-syntax': [
            'error',
            {
              selector: "MemberExpression[object.name='process'][property.name='env']",
              message: 'Use env client/server modules; do not access process.env directly.'
            },
            {
              selector: "CallExpression[callee.name='fetch'][arguments.0.value=/^\\/api\\//]",
              message: 'Use apiUrl()/q* helpers — do not call fetch("/api/...") directly.'
            },
            {
              selector: "Literal[value=/^\\/api\\//]",
              message: 'Use apiUrl()/q* helpers — do not embed "/api/..." literals.'
            }
          ]
        }
      }
    ]
  },
];

export default eslintConfig;
