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
    // Add animation keyframes
    animation: {
      'fade-in': 'fadeIn 0.4s ease-out forwards',
      'fade-out': 'fadeOut 0.3s ease-in forwards',
    },
    keyframes: {
      fadeIn: {
        '0%': { opacity: '0' },
        '100%': { opacity: '1' },
      },
      fadeOut: {
        '0%': { opacity: '1' },
        '100%': { opacity: '0' },
      },
    },
  },
  shortcuts: [
    ['app-bg', 'bg-background dark:bg-dark-background shadow-none border-none'],
    ['text-primary-dm', 'text-primary dark:text-dark-primary'],
    ['text-secondary-dm', 'text-secondary dark:text-dark-secondary'],
    ['text-accent-dm', 'text-accent dark:text-dark-accent'],
    ['hover-highlight-dm', 'hover:text-highlight dark:hover:text-dark-highlight'],
    ['animate-fade-in', 'opacity-0 animate-fade-in'], // Shortcut for fade-in animation
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
    'text-gray-400',
    'text-blue-500',
    'text-green-500',
    'text-red-500',
    'animate-fade-in',
    'animate-fade-out',
    'transition-opacity',
    'duration-300'
  ]
});
