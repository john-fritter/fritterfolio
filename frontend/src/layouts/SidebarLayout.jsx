import PropTypes from 'prop-types';
import Sidebar from "../components/Sidebar";
import { useState } from "react";

export default function SidebarLayout({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="flex h-full w-full bg-background dark:bg-dark-background text-primary-dm overflow-hidden">
      <Sidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div className="w-full">
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
