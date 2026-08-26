import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The node environment is enough: Node >= 20 exposes crypto.subtle globally,
    // which is all actionHash needs.
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
