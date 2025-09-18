// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default createConfigForNuxt({
  features: {
    tooling: true,
  },
}).append(
  {
    files: ['**/*.vue', '**/*.ts', '**/*.js', '**/*.mjs'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'vue/require-default-prop': 'off',
      'vue/prop-name-casing': 'off',
      'prettier/prettier': [
        'error',
        {
          printWidth: 200,
        },
      ],
      'no-console': 'off',
    },
  },
  prettierConfig
)
