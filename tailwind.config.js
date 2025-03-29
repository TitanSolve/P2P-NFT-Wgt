/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "base/30": "#FEFEFE",
        "gray/50": "#F9FAFB",
        "gray/100": "#F2F4F7",
        "gray/200": "#EAECF0",
        "gray/400": "#98A2B3",
        "gray/500": "#667085",
        "gray/700": "#344054",
        "gray/800": "#1D2939",
        "primary/25": "#F0E8FC",
        "primary/50": "#F9F5FF",
        "primary-text/50": "#E2D2F9",
        "primary/100": "#C4A4F4",
        "primary/200": "#A777EE",
        "primary/300": "#8543E8",
        "primary/400": "#8949E9",
        "primary/500": "#5616B6",
        "primary/600": "#411188",
        "primary-text/700": "#2B0B5B",
        "primary/700": "#6941C6",
        "primary/800": "#16062D",
        "primary/900": "#0B0317",
        "success/50": "#ECFDF3",
        "success/500": "#12B76A",
        "success/700": "#027A48",
        "error/500": "#F04438",
        "warning/500": "#F79009",
      }
    },
  },
  plugins: [],
}