import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoutes({ children }) {
  const { user } = useSelector(store => store.auth);

  // Try to read persisted auth from localStorage as fallback
  // This ensures we don't redirect to login while Redux is rehydrating
  let persistedUser = null;
  try {
    const persisted = localStorage.getItem('persist:root');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      if (parsed && parsed.auth) {
        const auth = JSON.parse(parsed.auth);
        persistedUser = auth && auth.user ? auth.user : null;
      }
    }
  } catch (e) {
    // ignore parse errors
  }

  // Check if user is authenticated (either in Redux or in persisted storage)
  const isAuthenticated = !!(user || persistedUser);

  return isAuthenticated ? children : <Navigate to="/login" />;
}
