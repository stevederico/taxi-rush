import { defineConfig } from 'vitest/config';

/** Runs the scripts in this folder. They print numbers and assert nothing. */
export default defineConfig({
  test: { environment: 'node', include: ['scripts/**/*.test.ts'] },
});
