import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import PropTypes from 'prop-types';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, loading, error] = useAuthState(auth);
  
  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};