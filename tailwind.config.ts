import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0a1628",
        gold: "#d4a017",
        pitch: "#1e7b22",
        "dark-blue": "#0f2042",
        "card-bg": "#111d35",
      },
    },
  },
  plugins: [],
};
export default config;
