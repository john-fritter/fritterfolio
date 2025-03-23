import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

// Constants
const MAX_NAME_LENGTH = 30;

const ListEditingModal = ({ isOpen, listName, onSave, onCancel, onChange }) => {
  const modalRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setError('');
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!listName.trim()) {
      setError('List name cannot be empty');
      return;
    }
    
    if (listName.trim().length > MAX_NAME_LENGTH) {
      setError(`List name cannot exceed ${MAX_NAME_LENGTH} characters`);
      return;
    }
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-medium text-secondary-dm mb-4">Edit List Name</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label 
              htmlFor="listName" 
              className="block text-sm font-medium text-secondary-dm mb-1"
            >
              List Name (max {MAX_NAME_LENGTH} characters)
            </label>
            <input
              id="listName"
              type="text"
              value={listName}
              onChange={(e) => onChange(e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-secondary-dm"
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-1">
              {listName.length}/{MAX_NAME_LENGTH}
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mb-4 text-sm text-red-500">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border rounded text-secondary-dm hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ListEditingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  listName: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired
};

export default ListEditingModal; 