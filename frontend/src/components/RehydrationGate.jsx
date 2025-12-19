import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

export default function RehydrationGate({ children }) {
  const { user } = useSelector(store => store.auth);
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    // Check if localStorage has auth data
    try {
      const persisted = localStorage.getItem('persist:root');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        if (parsed?.auth) {
          const auth = JSON.parse(parsed.auth);
          // We have persisted auth, wait for Redux to load it
          if (user) {
            setIsRehydrated(true);
          } else {
            // Redux hasn't loaded yet, wait a bit more
            const timer = setTimeout(() => setIsRehydrated(true), 500);
            return () => clearTimeout(timer);
          }
        } else {
          // No persisted auth
          setIsRehydrated(true);
        }
      } else {
        // No persisted data at all
        setIsRehydrated(true);
      }
    } catch (e) {
      console.log('Error checking rehydration:', e);
      setIsRehydrated(true);
    }
  }, [user]);

  if (!isRehydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
        <div className="text-center">
          <div className="inline-block">
            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-purple-500 rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return children;
}
