import PropTypes from 'prop-types';
import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function CenteredLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed inset-0 flex app-bg transition-colors duration-200">
      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar isOpen={true} toggleSidebar={toggleSidebar} />
      </div>
      
      {/* Simple centered content */}
      <main className="w-full md:ml-64 flex-1 overflow-auto flex items-center justify-center">
        <div className="w-[90%] sm:w-[350px] md:w-[350px]">
          {children}
        </div>
      </main>
      
      {/* Mobile Menu Button */}
      <button 
        className="md:hidden p-2 fixed top-1 left-1 text-primary-dm hover-highlight-dm rounded-lg 
          bg-white dark:bg-dark-background shadow-md hover:shadow-lg transition-all" 
        onClick={toggleSidebar}
      >
        ☰
      </button>
    </div>
  );
}

CenteredLayout.propTypes = {
  children: PropTypes.node.isRequired,
}; 