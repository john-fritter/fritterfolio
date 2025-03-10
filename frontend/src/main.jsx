import 'virtual:uno.css'  // Make sure this is at the top of the file
import '@fontsource/inter'  // Add this import at the top
import React from 'react'; // Add React import
import ReactDOM from "react-dom/client";
import Root from "./Root";

// Enhanced global styles with better scrollbar control
const style = document.createElement('style');
style.textContent = `
  html, body, #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  
  body {
    transition: background-color 0.3s ease;
  }

  /* Ensure all pages use the same scrollbar styling */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 20px;
  }

  html.dark .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
