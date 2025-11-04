/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Lora', 'Crimson Pro', 'Georgia', 'Times New Roman', 'serif'],
        'anthropic': ['Lora', 'Crimson Pro', 'Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
