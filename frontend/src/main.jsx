import 'virtual:uno.css'  // Make sure this is at the top of the file
import '@fontsource/inter'  // Add this import at the top
import React from 'react'; // Add React import
import ReactDOM from "react-dom/client";
import Root from "./Root";

// Add theme preference detection without forcing light mode
(function() {
  // Check if user has a saved preference
  const savedMode = localStorage.getItem('mode');
  
  // If no preference is saved, default to auto (system preference)
  if (!savedMode) {
    localStorage.setItem('mode', 'auto');
    
    // In auto mode, check system preference
    const prefersDark = window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply appropriate class based on system preference
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
  } else {
    // Apply saved preference (dark, light, or auto)
    if (savedMode === 'auto') {
      const prefersDark = window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(savedMode);
    }
  }
})();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
