import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'black';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('rf_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'black') return saved;
    } catch { /* ignore */ }
    return 'dark';
  });

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem('rf_theme', t); } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
