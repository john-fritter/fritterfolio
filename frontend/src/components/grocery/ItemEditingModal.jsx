import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const TAG_COLORS = [
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-800 dark:text-purple-200' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900', text: 'text-pink-800 dark:text-pink-200' },
  { name: 'indigo', bg: 'bg-indigo-100 dark:bg-indigo-900', text: 'text-indigo-800 dark:text-indigo-200' },
  { name: 'teal', bg: 'bg-teal-100 dark:bg-teal-900', text: 'text-teal-800 dark:text-teal-200' },
];

const Tag = ({ text, color, onRemove }) => (
  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${color ? `bg-${color}-100 dark:bg-${color}-900 text-${color}-800 dark:text-${color}-200` : ''} mr-2 mb-2`}>
    <span className="text-sm">{text}</span>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center w-4 h-4 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 border-0 outline-none"
      >
        <span className="text-xs font-bold">×</span>
      </button>
    )}
  </div>
);

Tag.propTypes = {
  text: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  onRemove: PropTypes.func
};

const ColorPicker = ({ selectedColor, onColorSelect }) => (
  <div className="flex gap-1 mb-2">
    {TAG_COLORS.map(color => (
      <button
        key={color.name}
        type="button"
        onClick={() => onColorSelect(color.name)}
        className={`w-6 h-6 rounded-full ${color.bg} ${selectedColor === color.name ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      />
    ))}
  </div>
);

ColorPicker.propTypes = {
  selectedColor: PropTypes.string.isRequired,
  onColorSelect: PropTypes.func.isRequired
};

const ItemEditingModal = ({ isOpen, itemName, tags = [], allTags = [], onSave, onCancel, onDeleteTag }) => {
  const [newName, setNewName] = useState(itemName);
  const [newTagText, setNewTagText] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0].name);
  const [itemTags, setItemTags] = useState(tags);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewName(itemName);
      setItemTags(tags);
      setNewTagText('');
      setError('');
    }
  }, [isOpen, itemName, tags]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    if (!newTagText.trim()) return;
    if (newTagText.length > 8) {
      setError('Tag must be 8 characters or less');
      return;
    }
    
    const newTag = {
      text: newTagText.trim(),
      color: selectedColor
    };
    
    setItemTags(prev => [...prev, newTag]);
    setNewTagText('');
    setShowPreview(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    setItemTags(prev => prev.filter(tag => tag.text !== tagToRemove.text));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      setError('Item name cannot be empty');
      return;
    }

    onSave({
      name: newName.trim(),
      tags: itemTags
    });
  };

  const handleAddExistingTag = (tag) => {
    if (!itemTags.some(t => t.text === tag.text)) {
      setItemTags(prev => [...prev, tag]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <h2 className="text-lg font-medium text-secondary-dm mb-4">Edit Item</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Item Name Input */}
          <div className="mb-4">
            <label 
              htmlFor="itemName" 
              className="block text-sm font-medium text-secondary-dm mb-1"
            >
              Item Name
            </label>
            <input
              id="itemName"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-secondary-dm"
              autoFocus
            />
          </div>

          {/* Current Tags */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary-dm mb-2">
              Current Tags
            </label>
            <div className="flex flex-wrap">
              {itemTags.map((tag, index) => (
                <Tag
                  key={`${tag.text}-${index}`}
                  text={tag.text}
                  color={tag.color}
                  onRemove={() => handleRemoveTag(tag)}
                />
              ))}
            </div>
          </div>

          {/* New Tag Input */}
          <div className="mb-4">
            <label 
              htmlFor="tag" 
              className="block text-sm font-medium text-secondary-dm mb-1"
            >
              Add Tag (max 8 characters)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="tag"
                type="text"
                value={newTagText}
                onChange={(e) => {
                  setNewTagText(e.target.value);
                  setShowPreview(true);
                }}
                maxLength={8}
                className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-secondary-dm"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Color Selection and Preview */}
          {newTagText && showPreview && (
            <div className="mb-4">
              <ColorPicker selectedColor={selectedColor} onColorSelect={setSelectedColor} />
              <div className="inline-block">
                <Tag text={newTagText} color={selectedColor} />
              </div>
            </div>
          )}

          {/* All Available Tags */}
          {allTags.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-dm mb-2">
                All Tags
              </label>
              <div className="flex flex-wrap gap-1 p-2 border border-gray-200 dark:border-gray-700 rounded max-h-32 overflow-y-auto">
                {allTags.map((tag, index) => (
                  <div
                    key={`${tag.text}-${index}`}
                    className="group relative"
                    onClick={() => handleAddExistingTag(tag)}
                  >
                    <Tag text={tag.text} color={tag.color} />
                    {onDeleteTag && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTag(tag);
                        }}
                        className="absolute -top-1 -right-1 hidden group-hover:block flex items-center justify-center w-4 h-4 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 border-0 outline-none"
                      >
                        <span className="text-xs font-bold">×</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 text-sm text-red-500">
              {error}
            </div>
          )}
          
          {/* Action Buttons */}
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

ItemEditingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  itemName: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  })),
  allTags: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired
  })),
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onDeleteTag: PropTypes.func
};

export default ItemEditingModal; 