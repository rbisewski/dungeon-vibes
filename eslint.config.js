import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    rules: {
      // Dense legacy-style statements (`a && b()`) and sequence expressions are used deliberately in hot loops.
      '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    // Game rules must stay pure: no rendering, audio, DOM or UI imports.
    files: ['src/rules/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['three', 'three/*'], message: 'src/rules must not depend on three.js.' },
          { group: ['preact', 'preact/*', '@preact/*'], message: 'src/rules must not depend on the UI.' },
          { group: ['**/render/**', '**/audio/**', '**/ui/**', '**/world/**', '**/actors/**', '**/game/**'], message: 'src/rules must stay pure (no engine imports).' },
        ],
      }],
    },
  },
);
