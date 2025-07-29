import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['src/**/*.ts'],
    rules: {
      // Basic ESLint rules
      'no-unused-vars': 'off', // TypeScript has its own unused vars check
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'prefer-template': 'error', // Prefer template literals over string concatenation
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'eqeqeq': ['error', 'always'], // Require === and !==
      'no-var': 'error', // Prefer let/const over var
      'prefer-const': 'error', // Prefer const over let when possible
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      'arrow-body-style': ['error', 'as-needed'],
      'arrow-parens': ['error', 'always'],
      'brace-style': ['error', '1tbs'],
      'curly': ['error', 'all'],
      'no-else-return': 'error',
      'no-lonely-if': 'error',
      'no-multi-spaces': 'error',
      'no-useless-return': 'error',

      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'error', // Disallow the any type to enforce better type safety
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/prefer-as-const': 'error',

      // Enforce using import type for type-only imports
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports'
        }
      ]
    }
  }
);