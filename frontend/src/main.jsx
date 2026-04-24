import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { LanguageProvider } from './i18n/index.jsx';

// NOTE: StrictMode removed intentionally.
// In development, React StrictMode deliberately double-invokes useEffect
// to help detect side effects. This causes every API call to fire TWICE
// on mount, which hits the backend rate limiter (429) immediately.
// Remove StrictMode during active development; re-add before production build.
createRoot(document.getElementById('root')).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
