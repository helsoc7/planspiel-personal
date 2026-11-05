/** Farben und Schrift aus dem CloudHelden-Foliendesign. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Nunito", "system-ui", "sans-serif"] },
      colors: {
        navy: { DEFAULT: "#154A8D", dunkel: "#0F3566" },
        blau: "#005FCC",
        tinte: "#121212",
        grau: { DEFAULT: "#5F5F6E", text: "#45454F", flaeche: "#F3F3F3", linie: "#DDDDDD", rahmen: "#CCCCCC" },
        hell: { DEFAULT: "#D7E6FA", aktiv: "#EAF1FB" },
        gut: { DEFAULT: "#15803D", flaeche: "#DCEFE2", text: "#14532D" },
        warn: { DEFAULT: "#C2410C", flaeche: "#F6E7C8", text: "#713F12" },
        schlecht: { DEFAULT: "#B91C1C", flaeche: "#F8DADA", text: "#7F1D1D" },
      },
      borderRadius: { karte: "12px" },
    },
  },
};
