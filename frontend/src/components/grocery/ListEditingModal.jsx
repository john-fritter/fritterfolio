import { useRef } from 'react';
import PropTypes from 'prop-types';

const ListEditingModal = ({ isOpen, listName, onSave, onCancel, onChange }) => {
  const inputRef = useRef(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-medium text-secondary-dm mb-4">Rename List</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(); }}>
          <input
            ref={inputRef}
            type="text"
            value={listName}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 border rounded mb-4"
            autoFocus
          />
          
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