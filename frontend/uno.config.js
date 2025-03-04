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
      'sidebar-bg': '#f8f9fa', // Example color

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
    ['app-bg', 'bg-background dark:bg-dark-background shadow-none border-none'],
    ['text-primary-dm', 'text-primary dark:text-dark-primary'],
    ['text-secondary-dm', 'text-secondary dark:text-dark-secondary'],
    ['text-accent-dm', 'text-accent dark:text-dark-accent'],
    ['hover-highlight-dm', 'hover:text-highlight dark:hover:text-dark-highlight'],
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
