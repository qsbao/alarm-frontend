import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="btn-ghost p-1.5 rounded-lg"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-theme-secondary hover:text-amber-400 transition-colors" />
      ) : (
        <Moon size={16} className="text-theme-muted hover:text-blue-600 transition-colors" />
      )}
    </button>
  );
}
