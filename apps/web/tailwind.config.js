/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7ff",
          100: "#e6ecff",
          500: "#4c5df5",
          600: "#3a46d1",
          700: "#2c36a3",
        },
      },
    },
  },
  plugins: [],
};
