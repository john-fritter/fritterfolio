function convertUTCToLocal(utcString) {
  return new Date(
    new Date(utcString).toLocaleString("en-US", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
  );
}

async function getSunriseSunset(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
    );
    const data = await response.json();

    if (data.status === 'OK') {
      const sunrise = convertUTCToLocal(data.results.sunrise);
      const sunset = convertUTCToLocal(data.results.sunset);
      return { sunrise, sunset };
    }
  } catch (error) {
    console.error('Error fetching sunrise/sunset times:', error);
  }

  // Fallback times
  const now = new Date();
  return {
    sunrise: new Date(now.setHours(6, 0, 0, 0)),
    sunset: new Date(now.setHours(18, 0, 0, 0))
  };
}

// Get user's geolocation
async function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.log("Geolocation not supported by this browser");
      resolve({ latitude: 40.7128, longitude: -74.0060 }); // NYC fallback
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        console.error("Error getting location:", error.message);
        resolve({ latitude: 40.7128, longitude: -74.0060 }); // NYC fallback
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

export async function isDarkMode() {
  // Get user's location
  const { latitude, longitude } = await getUserLocation();
  
  // Get sunrise/sunset times for that location
  const { sunrise, sunset } = await getSunriseSunset(latitude, longitude);
  const now = new Date();

  return now < sunrise || now > sunset;
}