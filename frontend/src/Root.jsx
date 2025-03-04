import { useState, useEffect } from "react";
import App from "./App.jsx";
import { ThemeProvider } from './context/ThemeContext';

export default function Root() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("mode") || "auto";
  });
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (mode === 'auto') {
      const prefersDark = window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      setIsDark(mode === 'dark');
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(mode);
    }
  }, [mode]);

  useEffect(() => {
    localStorage.setItem("mode", mode);
    
    if (mode === 'auto') {
      const prefersDark = window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        if (mode === 'auto') {
          setIsDark(e.matches);
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(e.matches ? 'dark' : 'light');
        }
      };
      
      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', handleChange);
        return () => darkModeMediaQuery.removeEventListener('change', handleChange);
      }
    }
  }, [mode]);

  const cycleMode = () => {
    setMode((current) => {
      let newMode;
      switch (current) {
        case 'auto': newMode = 'dark'; break;
        case 'dark': newMode = 'light'; break;
        default: newMode = 'auto';
      }
      return newMode;
    });
  };

  return (
    <ThemeProvider>
      <App mode={mode} cycleMode={cycleMode} isDark={isDark} />
    </ThemeProvider>
  );
}
