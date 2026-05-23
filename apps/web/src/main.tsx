import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles.css';

createRoot(document.getElementById('root')!, {
  onUncaughtError(error) {
    console.error('Uncaught React error', error);
  },
}).render(<App />);
