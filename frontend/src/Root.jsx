import { useState, useEffect } from "react";
import App from "./App.jsx";
import { isDarkMode } from './utils/isDarkMode';

export default function Root() {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("mode") || "auto";
  });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    async function updateDarkMode() {
      if (mode === 'auto') {
        const darkMode = await isDarkMode(); 
        setIsDark(darkMode);
      } else {
        setIsDark(mode === 'dark');
      }
    }

    updateDarkMode();
  }, [mode]);

  const cycleMode = () => {
    setMode((current) => {
      let newMode;
      switch (current) {
        case 'auto': newMode = 'dark'; break;
        case 'dark': newMode = 'light'; break;
        default: newMode = 'auto';
      }

      localStorage.setItem("mode", newMode);
      return newMode;
    });
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <App mode={mode} cycleMode={cycleMode} isDark={isDark} />
    </div>
  );
}
