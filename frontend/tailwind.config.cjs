// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
  fontSize: {
    xs: ["0.8rem", { lineHeight: "1.4" }],
    sm: ["0.9rem", { lineHeight: "1.5" }],
    base: ["1rem", { lineHeight: "1.6" }],
    lg: ["1.15rem", { lineHeight: "1.6" }],
    xl: ["1.3rem", { lineHeight: "1.4" }],
    "2xl": ["1.6rem", { lineHeight: "1.3" }],
  },
  extend: {},
},
  plugins: [],
};
