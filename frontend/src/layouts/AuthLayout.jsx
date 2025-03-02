import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

export default function AuthLayout({ children }) {
  return (
    <div className="fixed inset-0 app-bg transition-colors duration-200 flex flex-col">
      {/* Header with back button */}
      <header className="p-4 flex items-center">
        <Link to="/" className="text-primary-dm hover:text-accent-dm transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-secondary-dm ml-4">
          Account
        </h1>
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </main>
    </div>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
}; 