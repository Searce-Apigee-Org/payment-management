import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      eqeqeq: 'error',
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
    settings: {},
    ignores: ['node_modules/'],
  },
];
