import vuetify from 'eslint-config-vuetify'

export default vuetify(
  {
    ts: true,
  },
  // Every modal goes through components/ui/DModal.vue, which caps the height and
  // scrolls the body with the title and actions kept in view. A bare v-dialog
  // would skip that (and the look), so only DModal may use it.
  {
    files: ['**/*.vue'],
    rules: {
      'vue/no-restricted-syntax': ['error', {
        selector: 'VElement[rawName=/^(v-dialog|VDialog)$/]',
        message: 'Use DModal (components/ui/DModal.vue) for modals, not v-dialog directly.',
      }],
    },
  },
  {
    files: ['**/src/components/ui/DModal.vue'],
    rules: { 'vue/no-restricted-syntax': 'off' },
  },
)
