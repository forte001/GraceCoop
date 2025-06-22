import React, { createContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Get preferred theme from localStorage or fallback to system
  const getPreferredTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  };

  const [theme, setTheme] = useState(getPreferredTheme);

  // Apply theme to <html> and persist preference
  useEffect(() => {
    const resolvedTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : theme;

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', theme); // Store raw preference (e.g. 'system')
  }, [theme]);

  // Watch for system theme changes only when 'system' is selected
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = () => {
      const newResolved = mediaQuery.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newResolved);
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    handleSystemChange(); // Set initially

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
