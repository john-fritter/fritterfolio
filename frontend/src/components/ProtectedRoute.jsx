import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/auth';
import PropTypes from 'prop-types';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }
  
  if (!user) {
    // Store the intended destination for redirect after login
    sessionStorage.setItem('loginRedirect', window.location.pathname);
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired
}; 