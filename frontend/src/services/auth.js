import { API_URL } from './api';

// Token Management
export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
  sessionStorage.setItem('token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

export const getAuthHeader = () => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper function to create fetch with timeout
const fetchWithTimeout = async (url, options, timeout = 15000) => {
  const controller = new AbortController();
  const { signal } = controller;
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. The server took too long to respond.');
    }
    throw error;
  }
};

// API Calls
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
  setAuthToken(data.token);
  return data.user;
};

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
  setAuthToken(data.token);
  return data.user;
};

export const demoLogin = async () => {
  try {
    console.log('Sending demo login request...');
    const response = await fetchWithTimeout(
      `${API_URL}/auth/demo`, 
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      30000 // 30 second timeout for demo login which might take longer
    );

    if (!response.ok) {
      console.error('Demo login failed with status:', response.status);
      const errorData = await response.json();
      throw new Error(errorData.error || 'Demo login failed');
    }

    console.log('Demo login response received');
    const data = await response.json();
    setAuthToken(data.token);
    return data.user;
  } catch (error) {
    console.error('Demo login fetch error:', error);
    throw error;
  }
};

export const logout = async () => {
  const token = getAuthToken();
  
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { ...getAuthHeader() }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  clearAuthToken();
  return true;
};

export const getCurrentUser = async () => {
  const token = getAuthToken();
  
  if (!token) {
    return null;
  }
  
  const response = await fetch(`${API_URL}/auth/user`, {
    headers: getAuthHeader()
  });
  
  if (!response.ok) {
    clearAuthToken();
    return null;
  }
  
  const data = await response.json();
  return data.user;
}; 