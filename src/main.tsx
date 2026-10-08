import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { EvaluationProvider } from './state/EvaluationContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <EvaluationProvider>
        <App />
      </EvaluationProvider>
    </BrowserRouter>
  </StrictMode>,
);
