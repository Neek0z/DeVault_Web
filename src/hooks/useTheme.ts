import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'devault-theme';

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStored);

  useEffect(() => {
    apply(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const cycle = useCallback(() => {
    setThemeState((prev) =>
      prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'
    );
  }, []);

  return { theme, setTheme, cycle };
}
