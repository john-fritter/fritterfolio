import PropTypes from 'prop-types';

const ListSelectionModal = ({ isOpen, lists, onSelect, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-medium text-secondary-dm mb-4">Select a list to add items to:</h2>
        
        <div className="max-h-64 overflow-y-auto space-y-2">
          {lists.length === 0 ? (
            <p className="text-center py-4">No lists available. Create a list first.</p>
          ) : (
            lists.map(list => (
              <button
                key={list.id}
                className="w-full text-left p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => onSelect(list.id)}
              >
                <span className="text-primary-dm font-medium">{list.name}</span>
                <span className="text-sm text-secondary-dm block mt-1">
                  {list.items ? `${list.items.length} items` : 'Loading items...'}
                </span>
              </button>
            ))
          )}
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            className="px-4 py-2 border rounded text-secondary-dm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

ListSelectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  lists: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    items: PropTypes.array
  })).isRequired,
  onSelect: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ListSelectionModal; 