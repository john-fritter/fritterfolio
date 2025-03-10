// Helper function to detect current system preference (fallback)
export const getSystemPreference = () => {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark;
};

// Function to determine if it's nighttime based on sunrise/sunset
export const isNighttime = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch sunrise/sunset data');
    }
    
    const data = await response.json();
    
    // Parse the times to Date objects
    const sunrise = new Date(data.results.sunrise);
    const sunset = new Date(data.results.sunset);
    const now = new Date();
    
    // Determine if it's currently night time
    const isNight = now < sunrise || now > sunset;
    
    return isNight;
  } catch (error) {
    console.error('Error fetching sunrise/sunset data:', error);
    // Fall back to system preference if API fails
    return getSystemPreference();
  }
}; 