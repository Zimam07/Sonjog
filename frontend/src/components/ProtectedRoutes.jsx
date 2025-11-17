import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoutes({ children }) {
  const { user } = useSelector(store => store.auth);

  // If redux hasn't rehydrated yet, try to read persisted auth from localStorage
  // This helps E2E tests and avoids a flash redirect when the app is rehydrating.
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

  const isAuthenticated = !!(user || persistedUser);

  return isAuthenticated ? children : <Navigate to="/login" />;
}
