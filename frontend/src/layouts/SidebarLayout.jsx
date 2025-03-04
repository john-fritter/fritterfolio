import PropTypes from 'prop-types';
import Sidebar from "../components/Sidebar";
import { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';

export default function SidebarLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isGroceryPage = location.pathname === '/grocery';

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="absolute inset-0 flex flex-row app-bg overflow-x-hidden">
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1">
        <div className={`
          w-full p-4 md:p-8
          ${isGroceryPage ? 'flex flex-col items-start' : 'flex justify-center items-center'}
        `}>
          <div className={`${isGroceryPage ? 'w-full' : 'w-full max-w-4xl'}`}>
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
