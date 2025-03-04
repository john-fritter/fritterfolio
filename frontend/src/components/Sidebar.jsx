import PropTypes from 'prop-types';
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useState } from 'react';
import { useAuth } from '../context/useAuth';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { mode, cycleMode } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navLinkClasses = ({ isActive }) => `
    block px-4 py-2 rounded-lg transition-colors no-underline
    ${isActive 
      ? 'bg-primary/10 dark:bg-dark-primary/10 text-primary-dm font-medium' 
      : 'text-secondary-dm hover-highlight-dm hover:bg-primary/5 dark:hover:bg-dark-primary/5'
    }
  `;

  const getModeInfo = () => {
    switch (mode) {
      case 'light':
        return { label: 'L', icon: '💡', bgColor: 'bg-secondary/10' };
      case 'dark':
        return { label: 'D', icon: '🔅', bgColor: 'bg-secondary/30' };
      default:
        return { label: 'A', icon: '⚡', bgColor: 'bg-primary/20' };
    }
  };

  const { label, icon, bgColor } = getModeInfo();

  const handleNavClick = () => {
    if (isOpen) {
      toggleSidebar();
    }
  };

  const handleAuthAction = async () => {
    if (user) {
      // Show confirmation dialog
      setShowLogoutConfirm(true);
    } else {
      // User is not logged in, navigate to login page
      // Store current location before redirecting
      sessionStorage.setItem('loginRedirect', window.location.pathname);
      navigate('/login');
      if (isOpen) {
        toggleSidebar();
      }
    }
  };

  const confirmLogout = async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 
          w-32
          bg-background dark:bg-dark-background
          transition-transform duration-300 ease-in-out
          transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:z-0 md:h-screen
          opacity-100
          flex flex-col justify-between
          max-h-screen
          shadow-none border-none
        `}
        style={{ boxShadow: 'none' }}
      >
        {/* Main Content with selective overflow */}
        <div className="flex-1 p-4 overflow-y-auto">
          <NavLink
            to="/"
            className="text-2xl font-bold text-primary-dm mb-8 block hover:text-accent-dm transition-colors no-underline"
            onClick={handleNavClick}
          >
            John Fritter
          </NavLink>

          <div className="space-y-2">
            <NavLink to="/about" className={navLinkClasses} onClick={handleNavClick}>
              About Me
            </NavLink>
            <NavLink to="/adventure" className={navLinkClasses} onClick={handleNavClick}>
              Adventure
            </NavLink>
            <NavLink to="/grocery" className={navLinkClasses} onClick={handleNavClick}>
              Grocery List
            </NavLink>
          </div>
        </div>
        
        {/* Bottom Controls */}
        <div className="p-4 bg-background dark:bg-dark-background">
          <div className="flex items-center justify-between">
            {/* Auth Button */}
            <div className="relative group">
              <button
                onClick={handleAuthAction}
                className={`
                  group relative flex items-center justify-center
                  w-8 h-8 rounded-full 
                  ${user ? 'bg-primary/20 dark:bg-dark-primary/20' : 'bg-secondary/10 dark:bg-secondary/30'}
                  transition-colors duration-300
                  hover:bg-primary/10 dark:hover:bg-dark-primary/10
                `}
                title={user ? 'Logout' : 'Login'}
              >
                {user ? (
                  // Logged in icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-dm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  // Logged out icon
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary-dm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )}
              </button>
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-secondary/90 dark:bg-dark-secondary/90 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                {user ? 'Logout' : 'Login'}
              </div>
            </div>
            
            {/* Mode Toggle */}
            <button
              onClick={cycleMode}
              className={`
                group relative flex items-center justify-center
                w-8 h-8 rounded-full ${bgColor}
                transition-colors duration-300
                hover:bg-primary/10 dark:hover:bg-dark-primary/10
              `}
              title={`Theme: ${mode}`}
            >
              <span className="text-lg">{icon}</span>
              <span
                className="
                  absolute -top-1 -right-1 
                  text-[10px] font-medium text-secondary-dm 
                  bg-white dark:bg-dark-background 
                  rounded-full w-4 h-4 flex items-center justify-center
                "
              >
                {label}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE Hamburger Button - Keep only this one */}
      <button
        className="fixed top-4 left-4 z-[60] p-2 rounded-md bg-gray-100 dark:bg-gray-800 md:hidden"
        onClick={toggleSidebar}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="app-bg rounded-lg shadow-lg p-6 max-w-sm mx-auto">
            <h3 className="text-lg font-medium text-secondary-dm mb-4">Confirm Logout</h3>
            <p className="text-secondary-dm mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={cancelLogout}
                className="px-4 py-2 rounded-lg bg-secondary/10 dark:bg-secondary/20 text-secondary-dm hover:bg-secondary/20 dark:hover:bg-secondary/30 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-highlight dark:bg-dark-primary dark:hover:bg-dark-highlight transition-colors"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};
