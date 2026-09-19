import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
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
