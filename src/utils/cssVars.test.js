import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearCssVarCache, cssVar } from './cssVars';

const root = () => document.documentElement;

beforeEach(clearCssVarCache);

afterEach(() => {
  root().style.removeProperty('--x');
});

describe('cssVar', () => {
  it('caches per theme, so a theme switch re-reads the value', () => {
    root().dataset.theme = 'dark';
    root().style.setProperty('--x', '#111');
    expect(cssVar('--x')).toBe('#111');

    root().dataset.theme = 'light';
    root().style.setProperty('--x', '#eee');
    expect(cssVar('--x')).toBe('#eee');

    // Back to dark: served from that theme's cache entry.
    root().dataset.theme = 'dark';
    expect(cssVar('--x')).toBe('#111');
  });

  it('returns the fallback for an undefined variable', () => {
    expect(cssVar('--missing', '#abc')).toBe('#abc');
  });
});
