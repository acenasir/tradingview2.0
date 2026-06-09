import { defineConfig } from 'vitest/config';

// Indicator unit tests (pure functions) run in a plain Node environment.
export default defineConfig({
  test: {
    // Pure-function tests run in node; the App render smoke test opts into
    // jsdom via a per-file `// @vitest-environment jsdom` docblock.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
