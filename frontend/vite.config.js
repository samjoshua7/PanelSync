import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true, // or '0.0.0.0'
    port: 5173
  },
  plugins: [
    react(),
    tailwindcss()
    // ,
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   manifest: {
    //     name: 'PanelSync',
    //     short_name: 'PanelSync',
    //     start_url: '/',
    //     display: 'standalone',
    //     background_color: '#000000',
    //     theme_color: '#000000'
    //   }
    // })
  ]
})