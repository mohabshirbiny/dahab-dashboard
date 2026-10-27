import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import 'vuetify/styles'

// Vuetify's own icons (menus, selects, close buttons) as inline SVG: the app names no icon
// itself, so the 400 kB Material Design Icons font and its 7,000 classes are not loaded.
export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  defaults: {
    VBtn: {
      variant: 'flat',
      style: 'text-transform:none;letter-spacing:0;box-shadow:none;',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: 'auto',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      hideDetails: 'auto',
    },
  },
  theme: {
    defaultTheme: 'dahabLight',
    themes: {
      dahabLight: {
        dark: false,
        colors: {
          background: '#FAFAF8',
          surface: '#FFFFFF',
          primary: '#17160F',
          secondary: '#8B6F3D',
          info: '#2B5C7E',
          success: '#1F6B4C',
          warning: '#8A6516',
          error: '#9B3B2E',
        },
      },
    },
  },
  display: {
    mobileBreakpoint: 'md',
    thresholds: {
      xs: 0,
      sm: 600,
      md: 840,
      lg: 1145,
      xl: 1545,
      xxl: 2138,
    },
  },
})
