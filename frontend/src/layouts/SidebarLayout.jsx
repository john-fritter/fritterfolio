import PropTypes from 'prop-types';
import Sidebar from "../components/Sidebar";
import { useState } from "react";

export default function SidebarLayout({ children }) {
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
      
      {/* Main Content - now centered both horizontally and vertically */}
      <main className="w-full md:ml-32 flex-1 p-4 md:p-8 overflow-hidden flex justify-center items-center">
        <div className="w-full max-w-4xl">
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

SidebarLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
