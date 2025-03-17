import React from 'react';
import PropTypes from 'prop-types';
import ListRow from '../components/grocery/ListRow';
import ActionButton from '../components/grocery/ActionButton';

export default function GroceryLayout({
  title,
  showCheckAll,
  isAllChecked,
  onCheckAll,
  menuItems,
  children,
  isLoading,
  emptyMessage,
  addItemForm
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky app-bg top-0 z-10 border-b border-gray-200 dark:border-gray-700">
        <ListRow
          leftElement={
            showCheckAll ? (
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={(e) => onCheckAll(e.target.checked)}
                className="h-6 w-6 text-primary border-gray-300 rounded focus:ring-primary"
              />
            ) : null
          }
          text={
            <h1 className="text-2xl font-bold text-secondary-dm">
              {title}
            </h1>
          }
          rightElements={
            <div className="relative" ref={dropdownRef}>
              <ActionButton
                title="Menu"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                onClick={() => setMenuOpen(!menuOpen)}
                iconColor="text-blue-500"
              />
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-dark-background ring-1 ring-black ring-opacity-5 z-20">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {menuItems
                      .filter(item => item.show)
                      .map((item, index) => (
                        <button 
                          key={index}
                          onClick={() => {
                            item.action();
                            setMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-secondary-dm hover:bg-gray-100 dark:hover:bg-gray-800/40"
                          role="menuitem"
                        >
                          {item.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          }
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="py-4 px-4 text-center text-xl text-secondary-dm animate-fade-in transition-opacity duration-300">
            <div className="inline-block">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="opacity-90">Loading...</span>
            </div>
          </div>
        ) : children?.length > 0 ? (
          <div className="animate-fade-in transition-opacity duration-500">
            {children}
          </div>
        ) : (
          <div className="py-4 px-4 text-center text-xl text-secondary-dm animate-fade-in transition-opacity duration-300">
            {emptyMessage}
          </div>
        )}

        {!isLoading && addItemForm}
      </div>
    </div>
  );
}

GroceryLayout.propTypes = {
  title: PropTypes.node.isRequired,
  showCheckAll: PropTypes.bool,
  isAllChecked: PropTypes.bool,
  onCheckAll: PropTypes.func,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    action: PropTypes.func.isRequired,
    show: PropTypes.bool.isRequired
  })).isRequired,
  children: PropTypes.node,
  isLoading: PropTypes.bool.isRequired,
  emptyMessage: PropTypes.string.isRequired,
  addItemForm: PropTypes.node
}; 