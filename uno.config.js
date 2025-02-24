import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  presets: [presetUno()],
  theme: {
    colors: {
      // Light mode
      primary: '#0ea5e9',    // Vivid cyan
      secondary: '#334155',  // Dark slate
      accent: '#f97316',     // Orange
      background: '#f1f5f9', // Soft gray
      highlight: '#38bdf8',  // Light cyan

      // Dark mode
      'dark-primary': '#38bdf8',   // Lighter cyan for better contrast
      'dark-secondary': '#94a3b8', // Lighter gray for better visibility in dark mode
      'dark-accent': '#fb923c',    // Lighter orange
      'dark-background': '#0f172a', // Dark blue-gray
      'dark-highlight': '#0ea5e9',  // Cyan for hover
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    },
  },
  shortcuts: [
    ['app-bg', 'bg-[#f1f5f9] dark:bg-[#0f172a]'],
    ['text-primary-dm', 'text-[#0ea5e9] dark:text-[#38bdf8]'],
    ['text-secondary-dm', 'text-[#334155] dark:text-[#94a3b8]'],
    ['text-accent-dm', 'text-[#f97316] dark:text-[#fb923c]'],
    ['hover-highlight-dm', 'hover:text-[#38bdf8] dark:hover:text-[#0ea5e9]'],
  ],
  safelist: [
    'text-primary',
    'text-secondary',
    'text-accent',
    'bg-primary',
    'bg-secondary',
    'bg-accent',
    'bg-background',
    'text-highlight',
    'bg-highlight',
  ]
});
