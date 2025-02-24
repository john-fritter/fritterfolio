import { useState, useEffect } from "react";
import App from "./App.jsx";
import { isDarkMode } from './utils/isDarkMode';

export default function Root() {
  const [mode, setMode] = useState('auto');  // 'light', 'dark', or 'auto'
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Update isDark based on mode and system preference
    if (mode === 'auto') {
      setIsDark(isDarkMode());
    } else {
      setIsDark(mode === 'dark');
    }
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
    <div className={isDark ? 'dark' : ''}>
      <App mode={mode} cycleMode={cycleMode} isDark={isDark} />
    </div>
  );
} 