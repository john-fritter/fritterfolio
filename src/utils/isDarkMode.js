async function getSunriseSunset(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
    );
    const data = await response.json();
    
    if (data.status === 'OK') {
      // Convert UTC times to local Date objects
      const sunrise = new Date(data.results.sunrise);
      const sunset = new Date(data.results.sunset);
      return { sunrise, sunset };
    }
  } catch (error) {
    console.error('Error fetching sunrise/sunset times:', error);
  }
  
  // Fallback to default times if API fails
  const now = new Date();
  return {
    sunrise: new Date(now.setHours(6, 0, 0, 0)),
    sunset: new Date(now.setHours(18, 0, 0, 0))
  };
}

export async function isDarkMode(latitude = 40.7128, longitude = -74.0060) {
  const { sunrise, sunset } = await getSunriseSunset(latitude, longitude);
  const now = new Date();
  
  return now < sunrise || now > sunset;
} 