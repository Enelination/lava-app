/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09233a',
        deep: '#061a2c',
        navy: '#09263e',
        cream: '#f7f5f0',
        paper: '#ffffff',
        gold: '#e6b75c',
        sage: '#c7dfd2',
        mint: '#e9f3ed',
        line: '#dfe5e2',
        muted: '#69808b',
        red: '#a84942',
        sidebar: {
          hover: '#12344d',
          label: '#8da0b1',
        },
        approve: {
          bg: '#e2f3e9',
          text: '#176041',
        },
        flag: {
          bg: '#fff3df',
          text: '#94611c',
        },
        aiBubble: '#f3f6f4',
        online: '#4caa80',
        pin: '#fff6df',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm2: '7px',
      },
    },
  },
  plugins: [],
}
