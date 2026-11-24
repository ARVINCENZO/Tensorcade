import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'apps/*',
  'packages/*',
  'tools/*',
  {
    test: {
      name: 'root',
      include: ['tests/**/*.{test,spec}.ts'],
      exclude: ['tests/e2e/**'],
      environment: 'node',
    },
  },
]);
