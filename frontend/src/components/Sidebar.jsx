import PropTypes from 'prop-types';
import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar({ isOpen, toggleSidebar }) {
  const { mode, cycleMode } = useTheme();

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

  return (
    <nav className={`fixed md:static app-bg h-full w-64 flex flex-col transition-transform 
      duration-300 ease-in-out shadow-lg md:shadow-none
      ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        
      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <NavLink to="/" className="text-2xl font-bold text-primary-dm mb-8 block hover:text-accent-dm transition-colors no-underline" onClick={handleNavClick}>
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
          <NavLink to="/login" className={navLinkClasses} onClick={handleNavClick}>
            Login
          </NavLink>
        </div>
      </div>
      
      {/* Mode Toggle */}
      <div className="p-6 pb-4 flex-shrink-0">
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
          <span className="
            absolute -top-1 -right-1 
            text-[10px] font-medium text-secondary-dm 
            bg-white dark:bg-dark-background 
            rounded-full w-4 h-4 flex items-center justify-center
          ">
            {label}
          </span>
        </button>
      </div>
    </nav>
  );
}

Sidebar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired
};
