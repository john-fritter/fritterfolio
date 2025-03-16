import PropTypes from 'prop-types';

const TagFilterModal = ({ isOpen, onClose, tags, onSelectTag }) => {
  if (!isOpen) return null;

  // Get unique tags
  const uniqueTags = Array.from(new Set(tags.map(tag => JSON.stringify(tag))))
    .map(str => JSON.parse(str))
    .sort((a, b) => a.text.localeCompare(b.text));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-medium text-secondary-dm mb-4">Filter by Tag</h2>
        
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {uniqueTags.map((tag, index) => (
              <button
                key={`${tag.text}-${index}`}
                onClick={() => {
                  onSelectTag(tag);
                  onClose();
                }}
                className={`inline-flex items-center px-3 py-1.5 rounded-full bg-${tag.color}-100 dark:bg-${tag.color}-900 text-${tag.color}-800 dark:text-${tag.color}-200 hover:bg-${tag.color}-200 dark:hover:bg-${tag.color}-800 transition-colors`}
              >
                {tag.text}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="px-4 py-2 border rounded text-secondary-dm hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

TagFilterModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  tags: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  })).isRequired,
  onSelectTag: PropTypes.func.isRequired
};

export default TagFilterModal; 