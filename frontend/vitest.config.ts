import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Limit scope to core logic for initial threshold; expand later
      include: [
        'src/lib/**/*.ts',
        'src/lib/**/*.tsx',
        'src/server/**/*.ts',
        'src/app/api/**/*.ts',
        'src/utils/**/*.ts'
      ],
      exclude: [
        '**/node_modules/**',
        'src/**/*.d.ts',
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/components/**',
        'src/store/**',
        'src/types/**'
      ],
      thresholds: {
        lines: 30,
        functions: 35,
        branches: 30,
        statements: 30
      }
    }
  }
});
