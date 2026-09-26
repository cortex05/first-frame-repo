import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initTheme } from './utils/theme'

// Patch HTMLCanvasElement.getContext so Konva's hit-detection canvas
// gets willReadFrequently=true, suppressing the repeated getImageData warning.
const _getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, attrs) {
  if (type === '2d') {
    attrs = { willReadFrequently: true, ...attrs };
  }
  return _getContext.call(this, type, attrs);
};

// Sets <html data-theme> before the first render (dark unless light was saved).
initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
