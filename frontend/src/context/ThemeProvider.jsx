import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ThemeContext } from './ThemeContext';
import { getSystemPreference, isNighttime } from '../hooks/theme/utils.js';

export function ThemeProvider({ children }) {
  // Use a consistent storage key
  const STORAGE_KEY = 'theme-mode';
  
  const [mode, setMode] = useState(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem(STORAGE_KEY);
    
    if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
      return savedMode;
    }
    
    // Default to auto mode
    return 'auto';
  });
  
  // Determine if dark mode should be applied
  const determineIfDark = useCallback(async (currentMode) => {
    if (currentMode === 'auto') {
      return await isNighttime();
    }
    return currentMode === 'dark';
  }, []);
  
  const [isDark, setIsDark] = useState(() => {
    // Initial state just uses system preference as a temporary value
    // until we can get location and sunrise/sunset data
    const dark = mode === 'dark' || (mode === 'auto' && getSystemPreference());
    return dark;
  });
  
  // Apply theme based on mode and time of day
  useEffect(() => { 
    const updateTheme = async () => {
      // Determine dark mode status
      const shouldBeDark = await determineIfDark(mode);
      setIsDark(shouldBeDark);
      
      // Apply class to html element for UnoCSS dark mode to work
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        // Add styles to body to prevent white flashes
        document.body.style.backgroundColor = '#0f172a'; // dark-background color
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        // Reset body background
        document.body.style.backgroundColor = '#f1f5f9'; // background color
      }
    };
    
    updateTheme();
    
    // Store preference
    localStorage.setItem(STORAGE_KEY, mode);
    
    // If we're in auto mode, set up a timer to check sunrise/sunset
    // every hour to update theme appropriately
    if (mode === 'auto') {
      const intervalId = setInterval(updateTheme, 60 * 60 * 1000); // Check every hour
      return () => clearInterval(intervalId);
    }
  }, [mode, determineIfDark]);
  
  // Cycle through modes: light → dark → auto → light...
  const cycleMode = () => {
    setMode((current) => {
      let newMode;
      switch (current) {
        case 'light': newMode = 'dark'; break;
        case 'dark': newMode = 'auto'; break;
        case 'auto': newMode = 'light'; break;
        default: newMode = 'light';
      }
      return newMode;
    });
  };
  
  return (
    <ThemeContext.Provider value={{ 
      mode, 
      cycleMode, 
      isDark
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
}; 