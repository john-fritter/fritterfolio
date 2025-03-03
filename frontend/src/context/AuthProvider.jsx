import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as authService from '../services/auth';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Checking for current user...');
        const currentUser = await authService.getCurrentUser();
        console.log('Current user:', currentUser);
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
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
    setError(null);
    try {
      const user = await authService.login(email, password);
      console.log('User logged in:', user);
      setUser(user);
      return user;
    } catch (error) {
      setError(error.message);
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