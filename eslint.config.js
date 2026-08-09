import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/assets/**'],
  },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        __BUILD_STAMP__: 'readonly',
        /* Scritti dentro `src/sw.js` al momento della build, da
           `scripts/service-worker-build.mjs`. */
        __SW_VERSION__: 'readonly',
        __SW_BASE__: 'readonly',
        __SW_CORE_ASSETS__: 'readonly',
        __SW_IMMUTABLE_ASSETS__: 'readonly',
        __SW_OPTIONAL_ASSETS__: 'readonly',
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-vars': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
