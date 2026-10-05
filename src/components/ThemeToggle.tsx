// ============================================================
// العبها صح | EL3BHA SA7 - Theme Toggle (icon-only, by design)
// ============================================================

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      id="theme_toggle_btn"
      onClick={toggleTheme}
      aria-label={isLight ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهاري'}
      title={isLight ? 'الوضع الليلي' : 'الوضع النهاري'}
      className={`relative flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden active:scale-90
        ${isLight
          ? 'bg-white border-slate-200 text-amber-600 hover:border-amber-300 shadow-sm'
          : 'bg-zinc-900 border-zinc-800 text-amber-400 hover:border-amber-500/50'}
        ${className}`}
    >
      <span className="relative block w-3.5 h-3.5 sm:w-4 sm:h-4">
        <Sun
          className={`absolute inset-0 w-full h-full transition-all duration-300 ${
            isLight ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          }`}
        />
        <Moon
          className={`absolute inset-0 w-full h-full transition-all duration-300 ${
            isLight ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
      </span>
    </button>
  );
};
