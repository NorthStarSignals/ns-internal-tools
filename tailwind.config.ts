import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a0e1a",
          900: "#0f1629",
          800: "#1a2342",
          700: "#243056",
          600: "#2e3d6b",
        },
        accent: {
          blue: "#3b82f6",
          amber: "#f59e0b",
          green: "#10b981",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
