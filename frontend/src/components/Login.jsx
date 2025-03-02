import { useState } from 'react';
import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (error) {
      let errorMessage = 'Authentication failed. Please try again.';
      
      // Provide more specific error messages
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already in use. Try logging in instead.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-full w-full">
      <div
        className="app-bg shadow-lg rounded-lg p-4 sm:p-6 w-[90%] max-w-sm mx-auto
                   md:-translate-x-[40px] lg:-translate-x-[60px] xl:-translate-x-[80px]
                   overflow-visible"
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-primary-dm text-center">
          {isSignUp ? 'Create an Account' : 'Login to Your Account'}
        </h2>

        {error && (
          <div className="mb-4 p-2 sm:p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3 sm:space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1 text-xs sm:text-sm font-medium text-secondary-dm">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 sm:p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-background/50 text-secondary-dm focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-transparent text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1 text-xs sm:text-sm font-medium text-secondary-dm">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 sm:p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-background/50 text-secondary-dm focus:ring-2 focus:ring-primary dark:focus:ring-dark-primary focus:border-transparent text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 sm:py-3 px-3 sm:px-4 rounded-lg bg-primary text-white font-medium transition-colors text-sm sm:text-base
              hover:bg-highlight dark:bg-dark-primary dark:hover:bg-dark-highlight
              ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className="mt-4 sm:mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary-dm hover:text-accent-dm transition-colors text-sm"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
