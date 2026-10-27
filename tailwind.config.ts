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
        pl: {
          dark: "#1a0020",
          purple: "#37003c",
          plum: "#28002c",
          pink: "#ff2882",
          magenta: "#e90052",
          green: "#00ff85",
          gold: "#e5b53e",
          cyan: "#04f5ff",
          muted: "#94719e",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
