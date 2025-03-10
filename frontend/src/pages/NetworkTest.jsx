import { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import { useTheme } from '../hooks/theme';

export default function NetworkTest() {
  const [status, setStatus] = useState('Testing...');
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({});
  const [themeInfo, setThemeInfo] = useState({});
  const [systemInfo, setSystemInfo] = useState({});
  
  // Get theme context
  const { mode, cycleMode } = useTheme();

  // Collect theme debugging information
  useEffect(() => {
    const prefersDark = window.matchMedia && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const savedTheme = localStorage.getItem('theme');
    
    const html = document.documentElement;
    const htmlClasses = Array.from(html.classList);
    
    setThemeInfo({
      contextMode: mode,
      savedTheme: savedTheme || 'not set',
      systemPrefersDark: prefersDark,
      htmlClasses: htmlClasses,
      documentTheme: getComputedStyle(document.documentElement)
        .getPropertyValue('color-scheme'),
      mediaQueryResult: prefersDark ? 'prefers dark' : 'prefers light',
      bodyClasses: Array.from(document.body.classList)
    });
    
    // System info
    setSystemInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }, [mode]);

  // Network test
  useEffect(() => {
    const testConnection = async () => {
      try {
        const url = `${API_URL}/network-test`;
        console.log("Testing connection to:", url);
        
        const start = Date.now();
        const response = await fetch(url);
        const end = Date.now();
        
        const data = await response.json();
        
        setStatus('Connected');
        setDetails({
          ...data,
          responseTime: `${end - start}ms`,
          apiUrl: API_URL,
          host: window.location.host,
          protocol: window.location.protocol
        });
      } catch (err) {
        console.error("Network test failed:", err);
        setStatus('Failed');
        setError(err.toString());
        setDetails({
          apiUrl: API_URL,
          host: window.location.host,
          protocol: window.location.protocol
        });
      }
    };
    
    testConnection();
  }, []);

  // Test theme toggle function
  const testThemeToggle = () => {
    cycleMode();
  };

  // Force light or dark mode
  const forceTheme = (theme) => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    window.location.reload();
  };

  // Reset theme to system preference
  const resetTheme = () => {
    localStorage.removeItem('theme');
    window.location.reload();
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Debug Tools</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Theme Controls</h2>
        <div className="flex space-x-2 mb-4">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={testThemeToggle}
          >
            Toggle Theme (Current: {mode})
          </button>
          <button 
            className="px-4 py-2 bg-gray-700 text-white rounded"
            onClick={() => forceTheme('dark')}
          >
            Force Dark
          </button>
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
            onClick={() => forceTheme('light')}
          >
            Force Light
          </button>
          <button 
            className="px-4 py-2 bg-gray-500 text-white rounded"
            onClick={resetTheme}
          >
            Reset to System
          </button>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-4">
          <h3 className="font-medium mb-2">Theme Information:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(themeInfo, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Network Test</h2>
        <div className="mb-4">
          <span className="font-medium">Status: </span>
          <span className={status === 'Connected' ? 'text-green-500' : 'text-red-500'}>
            {status}
          </span>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-200 rounded mb-4">
            <h2 className="font-medium">Error:</h2>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </div>
        )}
        
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
          <h3 className="font-medium mb-2">Connection Details:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-medium mb-2">Device Information</h2>
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(systemInfo, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="pt-4">
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Clear Storage & Reload
        </button>
      </div>
    </div>
  );
} 