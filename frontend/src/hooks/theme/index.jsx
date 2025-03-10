import { useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { ThemeContext } from '../../context/ThemeContext';
import { getSystemPreference, isNighttime } from './utils.js';

export function ThemeProvider({ children }) {
  // Use a consistent storage key
  const STORAGE_KEY = 'theme-mode';
  
  const [mode, setMode] = useState(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem(STORAGE_KEY);
    console.log(`🔍 Saved theme mode from storage: ${savedMode || 'none'}`);
    
    if (savedMode && ['light', 'dark', 'auto'].includes(savedMode)) {
      return savedMode;
    }
    
    // Default to auto mode
    console.log('🔍 Using default auto mode');
    return 'auto';
  });
  
  // State to track location
  const [location, setLocation] = useState(null);
  
  // Get user's location when in auto mode
  useEffect(() => {
    if (mode === 'auto' && navigator.geolocation) {
      console.log('🔍 Requesting user location for auto theme');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`🔍 Got user location: ${latitude}, ${longitude}`);
          setLocation({ latitude, longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use system preference as fallback
          const darkSystem = getSystemPreference();
          setIsDark(darkSystem);
        }
      );
    }
  }, [mode]);
  
  // Determine if dark mode should be applied
  const determineIfDark = useCallback(async (currentMode) => {
    if (currentMode === 'auto') {
      if (location) {
        return await isNighttime(location.latitude, location.longitude);
      } else {
        // Fallback to system preference if location not available
        return getSystemPreference();
      }
    }
    return currentMode === 'dark';
  }, [location]);
  
  const [isDark, setIsDark] = useState(() => {
    // Initial state just uses system preference as a temporary value
    // until we can get location and sunrise/sunset data
    const dark = mode === 'dark' || (mode === 'auto' && getSystemPreference());
    console.log(`🔍 Initial dark mode state: ${dark}`);
    return dark;
  });
  
  // Apply theme based on mode and time of day
  useEffect(() => {
    console.log(`🔍 Theme mode changed to: ${mode}`);
    
    const updateTheme = async () => {
      // Determine dark mode status
      const shouldBeDark = await determineIfDark(mode);
      console.log(`🔍 Applying dark mode: ${shouldBeDark}`);
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
    console.log(`🔍 Saved theme mode to storage: ${mode}`);
    
    // If we're in auto mode, set up a timer to check sunrise/sunset
    // every hour to update theme appropriately
    if (mode === 'auto' && location) {
      console.log('🔍 Setting up hourly check for sunrise/sunset');
      const intervalId = setInterval(updateTheme, 60 * 60 * 1000); // Check every hour
      return () => clearInterval(intervalId);
    }
  }, [mode, location, determineIfDark]);
  
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
      console.log(`🔍 Cycling theme from ${current} to ${newMode}`);
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

export function useTheme() {
  return useContext(ThemeContext);
} 