import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Note: intentionally not wrapped in <StrictMode>. Lightweight-charts instances
// are imperatively created/destroyed in effects; StrictMode's double-invoke in
// dev would needlessly create and tear down every chart twice on mount.
const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(<App />);
