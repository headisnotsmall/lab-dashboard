/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')
const plugin = require('tailwindcss/plugin')

// 深色模式做法：把常用色盤改成 CSS 變數，深色時換一組值。
// 元件不需要寫 dark: 前綴，所有 bg-gray-50 / text-blue-700 會自動對應到深色版本。
const FAMILIES = ['gray', 'blue', 'red', 'green', 'orange', 'amber', 'purple', 'teal', 'pink', 'lime', 'cyan', 'indigo', 'yellow']
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

// 彩色：淺底 ↔ 深底對調，中間色稍微提亮，文字色變淺
const COLOR_DARK_MAP = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 400, 500: 500, 600: 500, 700: 400, 800: 300, 900: 200, 950: 100 }
// 灰階手動調過，讓卡片 / 邊框 / 文字層次在深色下依然清楚
const GRAY_DARK = {
  50: '#0d1117', 100: '#1f2633', 200: '#2a3241', 300: '#3b4456', 400: '#6b7280', 500: '#9ca3af',
  600: '#c3c8d1', 700: '#d8dce3', 800: '#e8eaee', 900: '#f3f4f6', 950: '#ffffff',
}
const SURFACE = { light: '#ffffff', dark: '#161b22' }

const toRgb = hex => {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

const themeColors = { surface: 'rgb(var(--c-surface) / <alpha-value>)' }
const lightVars = { '--c-surface': toRgb(SURFACE.light) }
const darkVars = { '--c-surface': toRgb(SURFACE.dark) }

for (const f of FAMILIES) {
  themeColors[f] = {}
  for (const s of SHADES) {
    themeColors[f][s] = `rgb(var(--c-${f}-${s}) / <alpha-value>)`
    lightVars[`--c-${f}-${s}`] = toRgb(colors[f][s])
    darkVars[`--c-${f}-${s}`] = toRgb(f === 'gray' ? GRAY_DARK[s] : colors[f][COLOR_DARK_MAP[s]])
  }
}

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: { colors: themeColors },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': { ...lightVars, colorScheme: 'light' },
        '@media (prefers-color-scheme: dark)': {
          ':root': { ...darkVars, colorScheme: 'dark' },
        },
      })
    }),
  ],
}
