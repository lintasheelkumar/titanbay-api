import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig(
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
      }],
      'no-console': 'off',
    },
  },
);
