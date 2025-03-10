import PropTypes from 'prop-types';
import Sidebar from "../components/Sidebar";
import { useState} from "react";
import { useLocation } from 'react-router-dom';

export default function SidebarLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isGroceryPage = location.pathname === '/grocery';

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-background dark:bg-dark-background text-primary-dm">
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden h-screen">
        <div className="w-full mx-auto px-2 sm:px-4 py-8">
          <div className={`${isGroceryPage ? 'max-w-2xl' : 'max-w-3xl'} mx-auto w-full`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

SidebarLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
