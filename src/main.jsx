import 'virtual:uno.css'  // Make sure this is at the top of the file
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import '@fontsource/inter'  // Add this import at the top
import { isDarkMode } from './utils/isDarkMode';

function Root() {
  const [mode, setMode] = useState('auto');  // 'light', 'dark', or 'auto'
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (mode !== 'auto') {
      setIsDark(mode === 'dark');
      return;
    }

    async function updateDarkMode(latitude, longitude) {
      const shouldBeDark = await isDarkMode(latitude, longitude);
      setIsDark(shouldBeDark);
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
  }, [mode]);

  const cycleMode = () => {
    setMode(current => {
      switch (current) {
        case 'auto': return 'dark';
        case 'dark': return 'light';
        default: return 'auto';  // 'light' goes back to 'auto'
      }
    });
  };

  return (
    <React.StrictMode>
      <div className={`${isDark ? 'dark' : ''} font-sans`}>
        <App mode={mode} cycleMode={cycleMode} />
      </div>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
