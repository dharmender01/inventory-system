
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F6FB",
        surface: "#FFFFFF",
        ink: "#0F172A",
        muted: "#64748B",
        border: "#E6E8F0",
        primary: { DEFAULT: "#4F46E5", dark: "#4338CA", light: "#6366F1" },
        accent: { DEFAULT: "#10B981", dark: "#059669", light: "#34D399" },
        danger: { DEFAULT: "#E11D48", dark: "#BE123C" },
        warning: "#D97706",
      },
      fontFamily: {
        sans: ['"Fira Sans"', "system-ui", "sans-serif"],
        mono: ['"Fira Code"', "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)",
        "sidebar-gradient": "linear-gradient(185deg, #1E1B4B 0%, #131A37 55%, #0B1120 100%)",
        "hero-gradient": "linear-gradient(115deg, #4F46E5 0%, #7C3AED 48%, #9333EA 100%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 2px 6px rgba(15,23,42,0.05)",
        "card-hover": "0 12px 28px -8px rgba(79,70,229,0.18), 0 4px 10px rgba(15,23,42,0.06)",
        modal: "0 30px 70px -15px rgba(20,16,60,0.45)",
        "glow-indigo": "0 12px 30px -10px rgba(99,102,241,0.5)",
        "glow-emerald": "0 12px 30px -10px rgba(16,185,129,0.45)",
        "glow-amber": "0 12px 30px -10px rgba(217,119,6,0.4)",
        "glow-sky": "0 12px 30px -10px rgba(14,165,233,0.4)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInLeft: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        overlayIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-3%,0) scale(1.08)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out both",
        "fade-in-up": "fadeInUp 300ms cubic-bezier(0.16,1,0.3,1) both",
        "scale-in": "scaleIn 190ms cubic-bezier(0.16,1,0.3,1) both",
        "slide-in-left": "slideInLeft 240ms cubic-bezier(0.16,1,0.3,1) both",
        "overlay-in": "overlayIn 180ms ease-out both",
        aurora: "aurora 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
