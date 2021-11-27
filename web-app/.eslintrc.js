const prettierConfig = require('./.prettierrc.js');

module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 2021 },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['tsconfig.json'],
        createDefaultProgram: true
      },
      plugins: ['@typescript-eslint', 'jsdoc', 'import'],
      extends: [
        'plugin:@angular-eslint/recommended',
        'plugin:@angular-eslint/template/process-inline-templates',
        'plugin:prettier/recommended'
      ],
      rules: {
        'prettier/prettier': ['error', prettierConfig],
        'jsdoc/newline-after-description': 1,
        '@angular-eslint/component-class-suffix': [
          'error',
          {
            suffixes: ['Directive', 'Component', 'Base', 'Widget']
          }
        ],
        '@angular-eslint/directive-class-suffix': [
          'error',
          {
            suffixes: ['Directive', 'Component', 'Base', 'Widget']
          }
        ],
        '@angular-eslint/component-selector': [
          'off',
          {
            type: ['element', 'attribute'],
            prefix: ['app', 'test'],
            style: 'kebab-case'
          }
        ],
        '@angular-eslint/directive-selector': [
          'off',
          {
            type: 'attribute',
            prefix: ['app']
          }
        ],
        '@angular-eslint/no-attribute-decorator': 'error',
        '@angular-eslint/no-conflicting-lifecycle': 'off',
        '@angular-eslint/no-forward-ref': 'off',
        '@angular-eslint/no-host-metadata-property': 'off',
        '@angular-eslint/no-lifecycle-call': 'off',
        '@angular-eslint/no-pipe-impure': 'error',
        '@angular-eslint/prefer-output-readonly': 'error',
        '@angular-eslint/use-component-selector': 'off',
        '@angular-eslint/use-component-view-encapsulation': 'off',
        '@angular-eslint/no-input-rename': 'off',
        '@angular-eslint/no-output-native': 'off',
        '@typescript-eslint/array-type': [
          'error',
          {
            default: 'array-simple'
          }
        ],
        '@typescript-eslint/ban-types': [
          'off',
          {
            types: {
              String: {
                message: 'Use string instead.'
              },
              Number: {
                message: 'Use number instead.'
              },
              Boolean: {
                message: 'Use boolean instead.'
              },
              Function: {
                message: 'Use specific callable interface instead.'
              }
            }
          }
        ],
        'import/no-duplicates': 'error',
        'import/no-unused-modules': 'error',
        'import/no-unassigned-import': 'error',
        'import/order': [
          'error',
          {
            alphabetize: { order: 'asc', caseInsensitive: false },
            'newlines-between': 'always',
            groups: ['external', 'internal', ['parent', 'sibling', 'index']],
            pathGroups: [],
            pathGroupsExcludedImportTypes: []
          }
        ],
        '@typescript-eslint/no-this-alias': 'error',
        '@typescript-eslint/member-ordering': 'off',
        'no-irregular-whitespace': 'error',
        'no-multiple-empty-lines': 'error',
        'no-sparse-arrays': 'error',
        'prefer-object-spread': 'error',
        'prefer-template': 'error',
        'prefer-const': 'off',
        'max-len': 'off'
      }
    },
    {
      files: ['*.html'],
      extends: ['plugin:@angular-eslint/template/recommended'],
      rules: {}
    },
    {
      files: ['*.html'],
      excludedFiles: ['*inline-template-*.component.html'],
      extends: ['plugin:prettier/recommended'],
      rules: {
        'prettier/prettier': ['error', { parser: 'angular' }],
        '@angular-eslint/template/eqeqeq': 'off'
      }
    }
  ]
};
