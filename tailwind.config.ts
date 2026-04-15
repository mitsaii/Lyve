import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ['class'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        surface: 'var(--surface)',
        card:    'var(--card)',
        accent:  'var(--accent)',
        accent2: 'var(--accent2)',
        accent3: 'var(--accent3)',
        text:    'var(--text)',
        muted:   'var(--muted)',
        faint:   'var(--faint)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
      boxShadow: {
        card: 'var(--shadow)',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'Microsoft JhengHei', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
