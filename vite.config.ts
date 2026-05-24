import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/faucet': {
        target: 'https://faucet.altnet.rippletest.net',
        changeOrigin: true,
        rewrite: () => '/accounts',
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
})
