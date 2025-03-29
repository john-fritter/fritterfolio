import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function GroceryDemo({ onStartDemo }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12 px-4">
      <div className="text-center space-y-4 max-w-lg">
        <h1 className="text-4xl font-bold text-primary-dm">Grocery List Tool</h1>
        <p className="text-lg text-secondary-dm">
          An easy way to manage your grocery shopping lists. Create lists, add items, 
          organize with tags, and share lists with friends and family.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-6">
        <button
          onClick={onStartDemo}
          className="bg-primary text-white dark:bg-dark-primary dark:text-dark-text py-3 px-6 rounded-lg font-medium text-lg hover:bg-primary/90 dark:hover:bg-dark-primary/90 transition-colors flex-1"
        >
          Try Demo
        </button>
        <button
          onClick={() => navigate('/login')}
          className="bg-secondary/10 text-secondary-dm py-3 px-6 rounded-lg font-medium text-lg hover:bg-secondary/20 transition-colors flex-1"
        >
          Log In / Sign Up
        </button>
      </div>

      <div className="mt-12 space-y-6 max-w-lg">
        <div className="p-4 rounded-lg bg-accent/5 dark:bg-dark-accent/5">
          <h3 className="text-xl font-semibold text-accent-dm mb-2">Create Lists</h3>
          <p className="text-secondary-dm">Organize your shopping with multiple lists for different stores or occasions.</p>
        </div>
        
        <div className="p-4 rounded-lg bg-accent/5 dark:bg-dark-accent/5">
          <h3 className="text-xl font-semibold text-accent-dm mb-2">Tag Items</h3>
          <p className="text-secondary-dm">Add custom tags to categorize your items and filter your lists easily.</p>
        </div>
        
        <div className="p-4 rounded-lg bg-accent/5 dark:bg-dark-accent/5">
          <h3 className="text-xl font-semibold text-accent-dm mb-2">Share Lists</h3>
          <p className="text-secondary-dm">Collaborate on shopping lists by sharing them with family and friends.</p>
        </div>
      </div>
    </div>
  );
}

GroceryDemo.propTypes = {
  onStartDemo: PropTypes.func.isRequired
}; 