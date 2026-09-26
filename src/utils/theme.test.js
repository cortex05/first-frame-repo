import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, initTheme, readStoredTheme } from './theme';

const root = () => document.documentElement;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readStoredTheme', () => {
  it('defaults to dark when nothing is stored', () => {
    expect(readStoredTheme()).toBe('dark');
  });

  it('returns a stored light theme', () => {
    window.localStorage.setItem('theme', 'light');
    expect(readStoredTheme()).toBe('light');
  });

  it.each(['Light', 'system', ''])('treats %j as invalid and returns dark', (value) => {
    window.localStorage.setItem('theme', value);
    expect(readStoredTheme()).toBe('dark');
  });

  it('returns dark when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('sets the attribute and stores the choice', () => {
    applyTheme('light');
    expect(root().dataset.theme).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('falls back to dark for an invalid theme', () => {
    expect(applyTheme('bogus')).toBe('dark');
    expect(root().dataset.theme).toBe('dark');
  });

  it('still switches the page when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => applyTheme('light')).not.toThrow();
    expect(root().dataset.theme).toBe('light');
  });
});

describe('initTheme', () => {
  it('starts dark on a first visit and leaves storage untouched', () => {
    initTheme();
    expect(root().dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBeNull();
  });

  it('restores a stored light theme', () => {
    window.localStorage.setItem('theme', 'light');
    initTheme();
    expect(root().dataset.theme).toBe('light');
  });
});
