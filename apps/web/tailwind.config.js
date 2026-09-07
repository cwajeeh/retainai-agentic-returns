/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Blue accent — also categorical slot 1 / the sequential hue from the
        // dataviz palette, so the brand color and chart color never clash.
        brand: {
          50: "#eef4fc",
          100: "#cde2fb",
          200: "#9ec5f4",
          300: "#6da7ec",
          400: "#3987e5",
          500: "#2a78d6",
          600: "#256abf",
          700: "#184f95",
          800: "#104281",
          900: "#0d366b",
        },
        // Warm-neutral ink scale (not default Tailwind slate/gray) for a less
        // templated, more considered feel.
        ink: {
          900: "#0b0b0b",
          700: "#3f3e3b",
          500: "#52514e",
          400: "#898781",
          300: "#c3c2b7",
          200: "#e1e0d9",
          100: "#f2f1ee",
          50: "#f9f9f7",
        },
        good: { DEFAULT: "#0ca30c", bg: "#e7f6e3" },
        warning: { DEFAULT: "#b3790a", bg: "#fdf1da" },
        critical: { DEFAULT: "#d03b3b", bg: "#fbe9e8" },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(11,11,11,0.04), 0 1px 6px -2px rgba(11,11,11,0.06)",
        popover: "0 8px 24px -4px rgba(11,11,11,0.12), 0 2px 8px -2px rgba(11,11,11,0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};
