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