import 'virtual:uno.css'  // Make sure this is at the top of the file
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import '@fontsource/inter'  // Add this import at the top
import { isDarkMode } from './utils/isDarkMode';

function Root() {
  const [darkMode, setDarkMode] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(true);

  useEffect(() => {
    if (!isAutoMode) return;

    async function updateDarkMode(latitude, longitude) {
      const isDark = await isDarkMode(latitude, longitude);
      setDarkMode(isDark);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDarkMode(latitude, longitude);
        
        const interval = setInterval(() => {
          updateDarkMode(latitude, longitude);
        }, 300000);

        return () => clearInterval(interval);
      },
      (error) => {
        console.log('Geolocation error:', error);
        updateDarkMode();
      }
    );
  }, [isAutoMode]);

  const toggleDarkMode = () => {
    setIsAutoMode(false);
    setDarkMode(prev => !prev);
  };

  return (
    <React.StrictMode>
      <div className={`${darkMode ? 'dark' : ''} font-sans`}>
        <App darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
