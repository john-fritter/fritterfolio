import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isRegistering) {
        // Validate passwords match for registration
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        // Register with email and password (no name required)
        await register(email, password);
      } else {
        await handleLogin(e);
      }
      
      // Redirect to the homepage or intended destination
      const redirectPath = sessionStorage.getItem('loginRedirect') || '/';
      sessionStorage.removeItem('loginRedirect');
      navigate(redirectPath);
    } catch (error) {
      // Display the error message from the server or a default message
      setError(error.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await login(email, password);
    } catch (err) {
      // Set a user-friendly error message
      if (err.message === 'Invalid credentials') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
      throw err; // Re-throw to prevent navigation
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-dark-background rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-secondary-dm">
        {isRegistering ? 'Create an Account' : 'Login to Your Account'}
      </h1>
      
      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-secondary-dm text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-secondary-dm text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        
        {isRegistering && (
          <div className="mb-6">
            <label className="block text-secondary-dm text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        )}
        
        <div className="flex flex-col gap-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded hover:bg-highlight dark:hover:bg-dark-highlight transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
              setConfirmPassword('');
            }}
            className="w-full text-primary-dm py-2 px-4 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </form>
    </div>
  );
}
