import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { installResizeObserver } from './resizeObserver';

// jsdom has no ResizeObserver: measured elements (the canvas areas) start at
// 800x600 in every test. See ./resizeObserver.js.
beforeEach(() => {
  installResizeObserver();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
