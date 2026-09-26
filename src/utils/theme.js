/**
 * Light/dark theme. Dark is the default for everyone and the OS
 * `prefers-color-scheme` is deliberately ignored. The choice lives on
 * <html data-theme> (which index.css keys off) and in localStorage.theme.
 * It is a device preference, so logout (useAuthStore.clearUserInfo) keeps it.
 */

export const THEMES = ["dark", "light"];
export const DEFAULT_THEME = "dark";
export const THEME_STORAGE_KEY = "theme";

export const isTheme = (value) => THEMES.includes(value);

export const readStoredTheme = () => {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const setDocumentTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

export const getDocumentTheme = () => {
  const current = document.documentElement.dataset.theme;
  return isTheme(current) ? current : DEFAULT_THEME;
};

export const applyTheme = (theme) => {
  const next = isTheme(theme) ? theme : DEFAULT_THEME;
  setDocumentTheme(next);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked (private mode etc.): the theme still applies for this page.
  }
  return next;
};

// Runs once before the first render. Doesn't write storage, so a first visit
// leaves the key unset.
export const initTheme = () => {
  setDocumentTheme(readStoredTheme());
};
