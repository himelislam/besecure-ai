import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./__tests__/setup.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // tests share one Mongo/Redis connection — avoid parallel workers
      },
    },
  },
});
