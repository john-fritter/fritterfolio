import { useState } from 'react';
import PropTypes from 'prop-types';

function ShareListModal({ isOpen, onClose, onShare, listName, isShared }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      const result = await onShare(email);
      if (result) {
        onClose();
      }
    } catch (err) {
      // Keep the modal open and display the error
      const errorMessage = err.message || 'Failed to share list';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-background rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-secondary-dm">
            Share &quot;{listName}&quot;
          </h2>
          
          {isShared && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded">
              This list is already shared. It can only be shared with one person.
            </div>
          )}
          
          {!isShared && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium text-secondary-dm mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-transparent text-secondary-dm"
                  placeholder="Enter email address"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs mt-1 text-secondary-dm/70">
                  The recipient will receive a notification to accept or reject this share.
                </p>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded text-secondary-dm"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </form>
          )}
          
          {isShared && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-primary text-white rounded"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ShareListModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  listName: PropTypes.string.isRequired,
  isShared: PropTypes.bool.isRequired
};

export default ShareListModal; 