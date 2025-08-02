// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class", // use class strategy
  theme: {
    extend: {
      backgroundImage: {
        'sidebar-light': 'linear-gradient(to bottom right, #2ca45a, #4db2a6)',
        'sidebar-dark': 'linear-gradient(to bottom right, #312e81, #4f46e5)',
      },
      colors: {
        primary: "#2ca45a",       // light mode primary
        secondary: "#4db2a6",     // light mode secondary
        darkPrimary: "#6366f1",   // dark mode primary
        darkSecondary: "#4f46e5", // dark mode secondary
        // === Global dark theme ===
        dark: {
          background: "#1e1b4b",     // deep indigo tone
          surface: "#2e2b6a",        // cards slightly lighter than bg
          border: "#4f46e5",         // vivid indigo (same as sidebar)
          primary: "#6366f1",        // indigo (for CTAs)
          secondary: "#4f46e5",      // matches sidebar
          accent: "#a5b4fc",         // lighter indigo (optional highlights)
          muted: "#a3a3c2",          // soft purple-gray
          textPrimary: "#f1f5f9",    // bright off-white
          textSecondary: "#cbd5e1",  // light gray-blue
        },

        // === Global light theme ===
        light: {
          background: "#e0f7f1",    // soft aqua-ish bg
          surface: "#ffffff",       // keep cards clean
          border: "#c7e4da",        // pale minty border
          primary: "#2ca45a",       // match sidebar green
          secondary: "#4db2a6",     // sidebar aqua
          accent: "#3b82f6",        // optional: keep strong CTA color
          muted: "#6b7280",         // still needed for text
          textPrimary: "#0f172a",   // deep navy text
          textSecondary: "#334155", // dark gray text
        },
      },

      borderWidth: {
        thin: "2.5px",
      },

      boxShadow: {
        card: "0 4px 12px rgba(0, 0, 0, 0.1)",
        cardDark: "0 4px 12px rgba(79, 70, 229, 0.25), 0 0 8px rgba(165, 180, 252, 0.15)",
      },

      backdropBlur: {
        sm: "4px",
        md: "8px",
      },
    },
  },
  plugins: [],
};
