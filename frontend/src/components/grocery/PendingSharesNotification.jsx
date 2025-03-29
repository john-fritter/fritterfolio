import PropTypes from 'prop-types';

function PendingSharesNotification({ pendingShares, onAccept, onReject }) {
  if (!pendingShares || pendingShares.length === 0) return null;

  return (
    <div className="sticky top-0 z-50 mx-4 mt-4 animate-fade-in opacity-100">
      <div className="bg-primary/10 dark:bg-dark-primary/10 border border-primary/20 dark:border-dark-primary/20 rounded-xl p-4 shadow-lg">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-primary-dm">
            Pending List Invitations
          </h3>
        </div>
        
        <div className="space-y-3">
          {pendingShares.map(share => (
            <div 
              key={share.id} 
              className="bg-white dark:bg-dark-background rounded-lg p-4 border border-gray-100 dark:border-gray-800 transition-all duration-200"
            >
              <p className="text-secondary-dm text-sm mb-3">
                <span className="font-medium text-primary-dm">{share.owner_name || share.owner_email}</span> has 
                shared &quot;{share.list_name}&quot; with you
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => onAccept(share.id)}
                  className="px-4 py-2 bg-primary dark:bg-dark-primary text-white rounded-lg text-sm font-medium transition-colors hover:bg-highlight dark:hover:bg-dark-highlight"
                >
                  Accept
                </button>
                <button
                  onClick={() => onReject(share.id)}
                  className="px-4 py-2 border border-red-500 dark:border-red-400 text-red-500 dark:text-red-400 rounded-lg text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

PendingSharesNotification.propTypes = {
  pendingShares: PropTypes.array.isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired
};

export default PendingSharesNotification; 