import { useAuth } from '../hooks/auth';
import { getAuthToken } from '../services/auth';
import { API_URL } from '../services/api';

export default function AuthDebug() {
  const { user, loading } = useAuth();
  const token = getAuthToken();
  
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Auth Debug</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="font-medium">Auth Status:</h2>
          <p>{loading ? 'Loading...' : user ? 'Logged In' : 'Not Logged In'}</p>
        </div>
        
        <div>
          <h2 className="font-medium">User Info:</h2>
          <pre className="bg-gray-100 p-2 rounded">
            {JSON.stringify(user, null, 2) || 'No user'}
          </pre>
        </div>
        
        <div>
          <h2 className="font-medium">Token Status:</h2>
          <p>{token ? 'Token exists' : 'No token'}</p>
          {token && (
            <p className="text-xs mt-1 text-gray-500">
              {token.substring(0, 10)}...{token.substring(token.length - 10)}
            </p>
          )}
        </div>
        
        <div>
          <h2 className="font-medium">API URL:</h2>
          <p>{API_URL}</p>
        </div>
        
        <div className="pt-4">
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Clear Storage & Reload
          </button>
        </div>
      </div>
    </div>
  );
} 