import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2563eb",
          600: "#1d4ed8",
          700: "#1e40af"
        }
      },
      boxShadow: {
        soft: "0 10px 30px -14px rgba(15, 23, 42, 0.35)"
      },
      backgroundImage: {
        "mesh-soft": "radial-gradient(circle at 20% 10%, rgba(59, 130, 246, 0.14), transparent 45%), radial-gradient(circle at 80% 0%, rgba(16, 185, 129, 0.12), transparent 40%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)"
      }
    }
  },
  plugins: []
};

export default config;
