"use client";

import { useTheme } from './ThemeProvider';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);
  
  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 700);
  };
  
  return (
    <button
      onClick={handleToggle}
      className={`relative overflow-hidden rounded-full p-1.5 bg-gradient-to-r ${
        theme === 'dark'
          ? 'from-indigo-900/40 to-violet-900/40 hover:from-indigo-800/50 hover:to-violet-800/50'
          : 'from-indigo-200 to-violet-200 hover:from-indigo-300 hover:to-violet-300'
      } transition-all duration-300 shadow-lg ${
        theme === 'dark' ? 'shadow-purple-900/30' : 'shadow-purple-300/30'
      }`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative">
        {/* Sun Icon */}
        <SunIcon
          className={`h-5 w-5 ${
            theme === 'dark'
              ? 'opacity-0 rotate-90 scale-0'
              : 'opacity-100 rotate-0 scale-100'
          } transition-all duration-500 text-amber-500`}
          style={{ position: theme === 'dark' ? 'absolute' : 'relative' }}
        />
        
        {/* Moon Icon */}
        <MoonIcon
          className={`h-5 w-5 ${
            theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-0'
          } transition-all duration-500 text-indigo-200`}
          style={{ position: theme === 'light' ? 'absolute' : 'relative', top: 0 }}
        />
      </div>
      
      {/* Animation overlay */}
      {isAnimating && (
        <span
          className={`absolute inset-0 ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-amber-300/80 to-amber-100/80'
              : 'bg-gradient-to-r from-indigo-900/80 to-purple-900/80'
          } rounded-full animate-theme-toggle`}
        />
      )}
    </button>
  );
}
