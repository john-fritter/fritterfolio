import { createContext, useState, useContext, useEffect } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Initialize with a simpler approach
  const [mode, setMode] = useState(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem('theme');
    if (savedMode) {
      return savedMode;
    }
    
    // If no preference is stored, default to light mode
    // This is a safer default than attempting to detect system preference
    return 'light';
  });
  
  // Apply theme class to document - simpler implementation
  useEffect(() => {
    // Force reset all classes
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(mode);
    
    // Store in localStorage
    localStorage.setItem('theme', mode);
    
    // Also set body class for redundancy
    document.body.className = mode;
    
    console.log(`Theme set to: ${mode}`);
  }, [mode]);
  
  const cycleMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    console.log(`Cycling theme from ${mode} to ${newMode}`);
    setMode(newMode);
  };
  
  const isDark = mode === 'dark';
  
  return (
    <ThemeContext.Provider value={{ mode, cycleMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 