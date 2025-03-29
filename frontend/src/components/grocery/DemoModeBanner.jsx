import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

export default function DemoModeBanner({ onExit }) {
  const navigate = useNavigate();

  return (
    <div className="bg-accent/10 dark:bg-dark-accent/10 py-2 px-4 rounded-lg mb-4 flex items-center justify-between m-2">
      <div className="flex items-center">
        <span className="text-sm font-medium text-accent-dm mr-2">Demo Mode</span>
        <span className="text-xs text-secondary-dm">
          You&apos;re using a shared demo account. Data will be reset whenever someone logs in.
        </span>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => navigate('/login')}
          className="text-xs text-primary-dm hover:underline"
        >
          Sign Up
        </button>
        <button 
          onClick={onExit}
          className="text-xs text-secondary-dm hover:underline"
        >
          Exit Demo
        </button>
      </div>
    </div>
  );
}

DemoModeBanner.propTypes = {
  onExit: PropTypes.func.isRequired
}; 