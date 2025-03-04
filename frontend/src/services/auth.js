const API_URL = 'http://localhost:5000/api';

// Register a new user
export const register = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Registration failed');
  }
  
  const data = await response.json();
  
  // Store token in localStorage
  localStorage.setItem('token', data.token);
  
  return data.user;
};

// Login user
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  }
  
  const data = await response.json();
  
  // Store token in localStorage
  localStorage.setItem('token', data.token);
  
  return data.user;
};

// Logout user
export const logout = async () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Remove token from localStorage
    localStorage.removeItem('token');
  }
  
  return true;
};

// Get current user
export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }
  
  try {
    const response = await fetch(`${API_URL}/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      localStorage.removeItem('token');
      return null;
    }
    
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Get current user error:', error);
    localStorage.removeItem('token');
    return null;
  }
};

// Enhance token storage
export const setAuthToken = (token) => {
  console.log("Setting auth token in localStorage");
  localStorage.setItem('token', token);
  // Also store in sessionStorage as a backup
  sessionStorage.setItem('token', token);
  return token;
};

export const getAuthToken = () => {
  // Try localStorage first, then sessionStorage as backup
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return token;
};

export const clearAuthToken = () => {
  console.log("Clearing auth token");
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

// Get auth header
export const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}; 