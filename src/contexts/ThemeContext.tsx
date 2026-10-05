// ============================================================
// العبها صح | EL3BHA SA7 - Global Theme Engine (Dark / Light)
//
// Single provider controlling the `data-theme` attribute on
// <html>, backed by the CSS variables defined in index.css.
// Persists the player's choice so it survives navigation,
// refresh, and re-opening the app.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'el3bha_sa7_theme_v2';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {}
});

function getInitialTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
  return 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Keep the native Android status/navigation bars independent from the
    // in-app theme toggle. The app itself changes; the system header does not.
    document.documentElement.style.setProperty('--native-bar-bg', '#0b0d10');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => setThemeState(mode), []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
