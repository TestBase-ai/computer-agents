import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks', // Use child processes instead of VM threads to support dynamic imports
    testTimeout: 120000, // 2 minutes for agent execution tests
    hookTimeout: 30000,
    include: ['tests/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
