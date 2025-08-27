"use client";

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to dark theme, but check localStorage on client
  const [theme, setTheme] = useState<Theme>('dark');
  
  useEffect(() => {
    // Check if theme was saved in localStorage
    const savedTheme = localStorage.getItem('jira-wizard-theme') as Theme | null;
    
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light-mode', savedTheme === 'light');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // If no saved preference, check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('light-mode', !prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Save to localStorage
    localStorage.setItem('jira-wizard-theme', newTheme);
    
    // Update document classes
    document.documentElement.classList.toggle('light-mode', newTheme === 'light');
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
