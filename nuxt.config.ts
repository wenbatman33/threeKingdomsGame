// https://nuxt.com/docs/api/configuration/nuxt-config
// GitHub Pages 部署時會帶 NUXT_APP_BASE_URL=/threeKingdomsGame/ 環境變數
const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // SPA 模式，不需要 SSR（遊戲以客戶端互動為主）
  ssr: false,
  modules: ['@pinia/nuxt'],
  devServer: {
    port: 3333,
  },
  app: {
    baseURL,
    // GitHub Pages 沒有 SPA 路由 fallback，用 hash 模式避免 /play 404
    head: {
      title: '三國志・州郡爭霸',
      htmlAttrs: { lang: 'zh-Hant' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  // 靜態站需要預渲染所有路由
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/play', '/editor'],
    },
  },
  css: ['~/assets/css/main.css'],
})
