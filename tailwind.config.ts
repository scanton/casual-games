import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        arcade: {
          red: '#BE1E2E',
          dark: '#0a0a0a',
          card: '#1a1a1a',
          border: '#2a2a2a',
        },
      },
      animation: {
        'pulse-heart': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
