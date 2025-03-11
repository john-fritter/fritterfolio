// Helper function to detect current system preference (fallback)
export const getSystemPreference = () => {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark;
};

// Get user's geolocation
async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: 40.7128, longitude: -74.0060 }); // NYC fallback
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        console.error("[Theme] Error getting location:", error.message);
        resolve({ latitude: 40.7128, longitude: -74.0060 }); // NYC fallback
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

// Function to determine if it's nighttime based on sunrise/sunset
export const isNighttime = async () => {
  try {
    // Get user's location first
    const { latitude, longitude } = await getUserLocation();
    
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch sunrise/sunset data');
    }
    
    const data = await response.json();
    
    if (data.status === 'OK') {
      // Create date objects directly from the UTC strings
      const sunriseUTC = new Date(data.results.sunrise);
      const sunsetUTC = new Date(data.results.sunset);
      
      // Ensure we're using today's date for sunrise and sunset
      const today = new Date();
      const sunriseToday = new Date(today.setHours(
        sunriseUTC.getHours(),
        sunriseUTC.getMinutes(),
        sunriseUTC.getSeconds()
      ));
      
      today.setHours(0, 0, 0, 0); // Reset to beginning of day
      const sunsetToday = new Date(today.setHours(
        sunsetUTC.getHours(),
        sunsetUTC.getMinutes(),
        sunsetUTC.getSeconds()
      ));

      const now = new Date();
      const isDark = now < sunriseToday || now > sunsetToday;
      
      return isDark;
    }
  } catch (error) {
    console.error('[Theme] Error in isNighttime:', error);
  }

  // If anything fails, fall back to system preference
  return getSystemPreference();
}; 