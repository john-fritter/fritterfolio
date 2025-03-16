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
    <div>
      {/* Header */}
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
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-dark-background ring-1 ring-black ring-opacity-5 z-10">
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {isLoading ? (
          <div className="py-4 px-4 text-center text-xl text-secondary-dm">
            Loading...
          </div>
        ) : children?.length > 0 ? (
          children
        ) : (
          <div className="py-4 px-4 text-center text-xl text-secondary-dm">
            {emptyMessage}
          </div>
        )}

        {addItemForm}
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