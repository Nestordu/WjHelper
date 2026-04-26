import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge';

/** GitHub 项目页子路径，例如仓库 WjHelper → https://user.github.io/WjHelper/ */
function pagesBase(): string {
  const raw = (process.env.VITE_PAGES_BASE || '').trim()
  if (!raw) return '/'
  let b = raw.startsWith('/') ? raw : `/${raw}`
  if (!b.endsWith('/')) b = `${b}/`
  return b
}

// https://vite.dev/config/
export default defineConfig({
  base: pagesBase(),
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    }), 
    tsconfigPaths()
  ],
})
