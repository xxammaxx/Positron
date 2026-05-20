import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-4xl font-bold text-positron-accent">
        Positron
      </h1>
    </div>
  );
}

createRoot(document.getElementById('root')!, {
  onUncaughtError(error) {
    console.error('Uncaught React error', error);
  },
}).render(<App />);
