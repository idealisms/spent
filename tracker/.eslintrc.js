/* eslint-disable @typescript-eslint/naming-convention */
/*
👋 Hi! This file was autogenerated by tslint-to-eslint-config.
https://github.com/typescript-eslint/tslint-to-eslint-config

It represents the closest reasonable ESLint configuration to this
project's original TSLint configuration.

We recommend eventually switching this configuration to extend from
the recommended rulesets in typescript-eslint.
https://github.com/typescript-eslint/tslint-to-eslint-config/blob/master/docs/FAQs.md

Happy linting! 💖
*/
module.exports = {
  'env': {
    'browser': true,
    'es6': true,
  },
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'sourceType': 'module',
  },
  'plugins': [
    '@typescript-eslint',
  ],
  'rules': {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        'selector': 'default',
        'format': ['camelCase'],
      },
      {
        'selector': 'variable',
        'format': [
          'camelCase',
          'PascalCase',  // variables that represent a class/component.
        ],
      },
      {
        'selector': 'variable',
        'modifiers': ['const'],
        'format': ['UPPER_CASE', 'camelCase', 'PascalCase'],
      },
      {
        'selector': 'property',
        'format': [
          'camelCase',
          'snake_case',  // compat with the transactions.json file format.
          'PascalCase',  // Some CSS/HTML properties
        ],
      },
      {
        'selector': 'property',
        'modifiers': ['readonly'],
        'format': [
          'UPPER_CASE',  // Some CSS/HTML properties
        ],
      },
      {
        'selector': 'class',
        'format': ['PascalCase'],
      },
      {
        'selector': 'interface',
        'format': ['PascalCase'],
        'custom': {
          'regex': '^I[A-Z]',
          'match': true,
        },
      },
      {
        'selector': 'enum',
        'format': ['PascalCase'],
      },
      {
        'selector': 'enumMember',
        'format': ['UPPER_CASE', 'PascalCase'],
      },
      {
        'selector': 'typeAlias',
        'format': [
          'PascalCase',
          'camelCase',
        ],
      },
    ],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      {
        'accessibility': 'explicit',
        'overrides': {
          'constructors': 'no-public',
        },
      },
    ],
    '@typescript-eslint/indent': [
      'error',
      2,
      {
        'CallExpression': {
          'arguments': 2,
        },
        'FunctionDeclaration': {
          'parameters': 2,
        },
        'FunctionExpression': {
          'parameters': 2,
        },
        'SwitchCase': 1,
      },
    ],
    '@typescript-eslint/member-delimiter-style': [
      'error',
    ],
    '@typescript-eslint/member-ordering': 'error',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/prefer-namespace-keyword': 'error',
    '@typescript-eslint/quotes': [
      'error',
      'single',
      {
        'avoidEscape': true,
      },
    ],
    '@typescript-eslint/semi': [
      'error',
    ],
    '@typescript-eslint/type-annotation-spacing': 'error',
    'brace-style': [
      'error',
      '1tbs',
    ],
    'camelcase': 'off',
    'comma-dangle': [
      'error',
      'always-multiline',
    ],
    'curly': 'error',
    'default-case': 'error',
    'eol-last': 'error',
    'eqeqeq': [
      'off',
      'smart',
    ],
    'guard-for-in': 'error',
    'id-blacklist': 'off',
    'id-match': 'off',
    'max-len': [
      'error',
      {
        'code': 140,
      },
    ],
    'no-bitwise': 'error',
    'no-caller': 'error',
    'no-cond-assign': 'error',
    'no-console': [
      'off',
      {
        'allow': [
          'log',
          'dirxml',
          'warn',
          'error',
          'dir',
          'timeLog',
          'assert',
          'clear',
          'count',
          'countReset',
          'group',
          'groupCollapsed',
          'groupEnd',
          'table',
          'Console',
          'markTimeline',
          'profile',
          'profileEnd',
          'timeline',
          'timelineEnd',
          'timeStamp',
          'context',
        ],
      },
    ],
    'no-debugger': 'error',
    'no-empty': 'error',
    'no-eval': 'error',
    'no-fallthrough': 'error',
    'no-new-wrappers': 'error',
    'no-redeclare': 'error',
    'no-shadow': [
      'error',
      {
        'hoist': 'all',
      },
    ],
    'no-trailing-spaces': 'error',
    'no-underscore-dangle': 'off',
    'no-unused-labels': 'error',
    'no-var': 'error',
    'radix': 'error',
    'spaced-comment': [
      'error',
      'always',
      {
        'markers': [
          '/',
        ],
      },
    ],
  },
};
