/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: '#181818', panel: '#1f1f1f', card: '#282828', border: '#3c3c3c',
        text: '#cccccc', muted: '#8b8b8b', cblue: '#569cd6', ccyan: '#4ec9b0',
        corange: '#ce9178', cpurple: '#c586c0', cgreen: '#6a9955', cyellow: '#dcdcaa',
        cred: '#f44747', cgold: '#ffd700', ccall: '#4fc1ff'
      },
      fontFamily: { mono: ["'Fira Code'", "'Consolas'", "monospace"] }
    }
  },
  plugins: []
}