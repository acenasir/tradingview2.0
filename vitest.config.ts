import { defineConfig } from 'vitest/config';

// Indicator unit tests (pure functions) run in a plain Node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
