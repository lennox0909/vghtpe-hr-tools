/** @type {import('tailwindcss').Config} */
module.exports = {
  // 讓暗黑模式透過切換 'dark' class 來觸發
  darkMode: 'class', 
  content: [
    "./**/*.html",
    "./**/*.md",
    "./**/*.js",
    "./**/*.go",
    "./_data/**/*.yml",
    "!./node_modules/**",
    "!./_site/**"
  ],
  theme: {
    extend: {
      // 合併 diagram 專屬的排版設定：移除行內程式碼預設的前後反引號
      typography: {
        DEFAULT: {
          css: {
            'code::before': { content: 'none' },
            'code::after': { content: 'none' }
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}