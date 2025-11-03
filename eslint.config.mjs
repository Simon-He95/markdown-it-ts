import simon from '@antfu/eslint-config'

export default simon(
  {
    ignores: [
      '**/**/*.d.ts',
      'test',
      'benchmark',
      'scripts',
    ],
  },
  {
    rules: {
      'no-console': 'off',
      'ts/ban-types': 'off',
      'jsdoc/require-returns-description': 'off',
      'no-new-func': 'off',
      'unicorn/no-new-array': 'off',
      'jsdoc/require-returns-check': 'off',
      'jsdoc/check-param-names': 'off',
      'no-cond-assign': 'off',
      'no-eval': 'off',
      'antfu/no-import-dist': 'off',
      'vue/require-toggle-inside-transition': 'off',
    },
    ignores: ['**/fixtures', 'test'],
  },
  {},
)
