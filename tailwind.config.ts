import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bc-blue": "#0054A6",
        "bc-celeste": "#00AEEF",
      },
    },
  },
  plugins: [],
};
export default config;
