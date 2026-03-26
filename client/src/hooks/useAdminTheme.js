import { useEffect, useState } from 'react';

const ADMIN_THEME_STORAGE_KEY = 'tricore-admin-theme';
const ADMIN_THEME_CHANGE_EVENT = 'tricore-admin-theme-change';

const normalizeAdminTheme = (value) => (value === 'dark' ? 'dark' : 'light');

const readStoredAdminTheme = () => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return normalizeAdminTheme(window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY));
};

const persistAdminTheme = (theme) => {
  const normalizedTheme = normalizeAdminTheme(theme);

  window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, normalizedTheme);
  window.dispatchEvent(
    new CustomEvent(ADMIN_THEME_CHANGE_EVENT, {
      detail: normalizedTheme
    })
  );

  return normalizedTheme;
};

export default function useAdminTheme() {
  const [theme, setThemeState] = useState(readStoredAdminTheme);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === ADMIN_THEME_STORAGE_KEY) {
        setThemeState(normalizeAdminTheme(event.newValue));
      }
    };

    const handleThemeChange = (event) => {
      setThemeState(normalizeAdminTheme(event.detail));
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(ADMIN_THEME_CHANGE_EVENT, handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(ADMIN_THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, []);

  const setTheme = (nextTheme) => {
    const resolvedTheme =
      typeof nextTheme === 'function' ? nextTheme(theme) : nextTheme;
    const normalizedTheme = persistAdminTheme(resolvedTheme);
    setThemeState(normalizedTheme);
  };

  return {
    theme,
    setTheme,
    isDarkTheme: theme === 'dark'
  };
}
