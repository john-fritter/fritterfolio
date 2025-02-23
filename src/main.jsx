import 'virtual:uno.css'  // Make sure this is at the top of the file
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import '@fontsource/inter'  // Add this import at the top
import { isDarkMode } from './utils/isDarkMode';

function Root() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Function to update dark mode
    async function updateDarkMode(latitude, longitude) {
      const isDark = await isDarkMode(latitude, longitude);
      setDarkMode(isDark);
    }

    // Get user's location and update dark mode
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDarkMode(latitude, longitude);
        
        // Update every 5 minutes
        const interval = setInterval(() => {
          updateDarkMode(latitude, longitude);
        }, 300000); // 5 minutes in milliseconds

        return () => clearInterval(interval);
      },
      (error) => {
        // Fallback to default coordinates if geolocation is denied
        console.log('Geolocation error:', error);
        updateDarkMode();
      }
    );
  }, []);

  return (
    <React.StrictMode>
      <div className={`${darkMode ? 'dark' : ''} font-sans`}>
        <App />
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
