import PropTypes from 'prop-types';

function PendingSharesNotification({ pendingShares, onAccept, onReject, onClose }) {
  if (!pendingShares || pendingShares.length === 0) return null;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-md font-medium text-blue-800 dark:text-blue-300">
          Pending List Invitations
        </h3>
        <button 
          onClick={onClose}
          className="text-blue-500 hover:text-blue-700"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3">
        {pendingShares.map(share => (
          <div key={share.id} className="bg-white dark:bg-gray-800 rounded p-3 shadow-sm">
            <p className="text-sm text-secondary-dm mb-1">
              <span className="font-semibold">{share.owner_name || share.owner_email}</span> has 
              shared &quot;{share.list_name}&quot; with you
            </p>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => onAccept(share.id)}
                className="px-3 py-1 bg-green-500 text-white rounded-md text-sm"
              >
                Accept
              </button>
              <button
                onClick={() => onReject(share.id)}
                className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

PendingSharesNotification.propTypes = {
  pendingShares: PropTypes.array.isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

export default PendingSharesNotification; 