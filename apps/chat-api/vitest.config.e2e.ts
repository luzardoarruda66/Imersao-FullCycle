import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    globalSetup: ['./test/support/global-setup.ts'],
    setupFiles: ['./test/support/env.ts'],
    // Os testes compartilham o banco `chat_test`: um arquivo de cada vez.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
