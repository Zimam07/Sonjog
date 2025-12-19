import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Provider } from 'react-redux';
import store from './redux/store.js';
import { Toaster } from 'sonner';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore } from 'redux-persist';

let persistor = persistStore(store);

// Loading component shown during rehydration
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
    <div className="text-center">
      <div className="inline-block">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-purple-500 rounded-full animate-spin" />
      </div>
      <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// expose the Redux store in development for end-to-end tests and debugging
if (import.meta.env && import.meta.env.DEV) {
  // attach under a guarded name so tests can set auth state when needed
  // eslint-disable-next-line no-undef
  window.__APP_STORE__ = store;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <App />
        <Toaster />
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);