import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as authService from '../services/auth';
import { AuthContext } from './AuthContext';
import * as api from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkCurrentUser = async () => {
      console.log("Checking for current user...");
      const token = authService.getAuthToken();
      
      if (!token) {
        console.log("No token found, user is not logged in");
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        console.log("Token found, verifying with server...");
        const response = await fetch(`${api.API_URL}/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          console.log("Server rejected token, logging out");
          authService.clearAuthToken();
          setUser(null);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log("Current user:", data.user);
        setUser(data.user);
      } catch (error) {
        console.error("Error verifying auth token:", error);
        authService.clearAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkCurrentUser();
  }, []);

  // Register a new user (email/password only)
  const register = async (email, password) => {
    setError(null);
    try {
      // Call the register function without name
      const user = await authService.register(email, password);
      setUser(user);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      const response = await fetch(`${api.API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Login API error:", errorData);
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      console.log("Login successful, setting token");
      
      // Use enhanced token storage
      authService.setAuthToken(data.token);
      
      setUser(data.user);
      return data;
    } catch (error) {
      console.error("Login function error:", error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};