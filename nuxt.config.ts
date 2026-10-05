// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxt/scripts'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0b0a09' }
      ],
      link: [{ rel: 'icon', href: '/favicon.ico' }]
    }
  },

  css: ['~/assets/css/main.css'],

  // Frameline is a dark-only experience; the grain/vignette art direction assumes it.
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  runtimeConfig: {
    // Server-only. Set via NUXT_TMDB_TOKEN.
    tmdbToken: '',
    public: {
      // Public by design (Mapbox public tokens are URL-restricted). NUXT_PUBLIC_MAPBOX_TOKEN.
      mapboxToken: ''
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // @nuxt/fonts is installed and registered by @nuxt/ui; this just declares the families.
  fonts: {
    families: [
      { name: 'Fraunces', provider: 'google', weights: ['300 900'], styles: ['normal', 'italic'] },
      { name: 'Inter', provider: 'google', weights: ['300 700'] }
    ]
  },

  image: {
    // TMDB already serves pre-sized images from its CDN, so a custom provider maps
    // requested widths to TMDB size buckets instead of proxying through IPX.
    providers: {
      tmdb: {
        name: 'tmdb',
        provider: '~/providers/tmdb.ts'
      }
    },
    domains: ['image.tmdb.org']
  }
})
