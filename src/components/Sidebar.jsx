import { useState } from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinkClasses = ({ isActive }) => `
    block px-4 py-2 rounded-lg transition-colors
    ${isActive 
      ? 'bg-primary/10 dark:bg-dark-primary/10 text-primary-dm font-medium' 
      : 'text-secondary-dm hover-highlight-dm hover:bg-primary/5 dark:hover:bg-dark-primary/5'
    }
  `;

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden p-2 fixed top-4 left-4 text-primary-dm hover-highlight-dm rounded-lg 
          bg-white dark:bg-dark-background shadow-md hover:shadow-lg transition-all" 
        onClick={() => setIsOpen(!isOpen)}
      >
        ☰
      </button>

      {/* Sidebar */}
      <nav className={`fixed md:static app-bg h-full w-64 p-6 transition-transform 
        duration-300 ease-in-out shadow-lg md:shadow-none
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        
        <div className="text-2xl font-bold text-primary-dm mb-8">John Fritter</div>

        <div className="space-y-2">
          <NavLink to="/about" className={navLinkClasses}>
            About Me
          </NavLink>
          <NavLink to="/adventure" className={navLinkClasses}>
            Adventure
          </NavLink>
        </div>
      </nav>
    </>
  );
}
