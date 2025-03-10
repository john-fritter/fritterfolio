import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from './AuthContext';
import * as auth from '../services/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const user = await auth.getCurrentUser();
        setUser(user);
      } catch (err) {
        console.error('Error getting current user:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkCurrentUser();
  }, []);

  const login = async (email, password) => {
    try {
      const user = await auth.login(email, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const register = async (email, password) => {
    try {
      const user = await auth.register(email, password);
      setUser(user);
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await auth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};