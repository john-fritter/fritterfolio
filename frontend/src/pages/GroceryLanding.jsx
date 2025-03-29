import { useState } from 'react';
import { useAuth } from '../hooks/auth';
import GroceryDemo from '../components/grocery/GroceryDemo';
import Grocery from './Grocery';
import Notification from '../components/Notification';

export default function GroceryLanding() {
  const { user, loading, demoLogin } = useAuth();
  const [startingDemo, setStartingDemo] = useState(false);
  const [error, setError] = useState(null);
  
  const handleStartDemo = async () => {
    setStartingDemo(true);
    setError(null);
    
    try {
      await demoLogin();
      setStartingDemo(false);
    } catch (err) {
      console.error('Demo login error:', err);
      setError(err.message || 'Failed to start demo. Please try again later.');
      setStartingDemo(false);
    }
  };
  
  if (loading || startingDemo) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-t-primary border-r-primary/30 border-b-primary/10 border-l-primary/60 rounded-full animate-spin mx-auto"></div>
          <p className="text-secondary-dm">{startingDemo ? 'Starting demo...' : 'Loading...'}</p>
          {startingDemo && (
            <p className="text-secondary-dm/70 text-sm max-w-md">
              Creating a fresh demo account with sample grocery lists. This may take a moment...
            </p>
          )}
        </div>
      </div>
    );
  }
  
  // If user is logged in, render the Grocery component
  if (user) {
    return <Grocery />;
  }
  
  // If not logged in, render the demo page
  return (
    <>
      {error && (
        <Notification
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}
      <GroceryDemo onStartDemo={handleStartDemo} />
    </>
  );
} 