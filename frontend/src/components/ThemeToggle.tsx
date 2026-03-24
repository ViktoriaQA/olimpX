import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-primary transition-transform duration-200 ease-in-out ${
          theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      >
        <span className="flex h-full w-full items-center justify-center">
          {theme === 'dark' ? (
            <Moon className="h-3 w-3 text-primary-foreground" />
          ) : (
            <Sun className="h-3 w-3 text-primary-foreground" />
          )}
        </span>
      </span>
    </button>
  );
};
