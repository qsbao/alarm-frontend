import { AlertTriangle } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { UserSwitcher } from '../components/UserSwitcher';

export function AppShell() {
  return (
    <div className="h-screen flex flex-col bg-surface-base">
      <header className="header-bar flex items-center px-4 h-10 shrink-0 gap-3">
        <Link
          to="/issues"
          className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-accent-subtle text-theme-accent"
          title="Fab Alarm"
        >
          <AlertTriangle className="w-4 h-4" />
        </Link>

        <span className="text-xs font-semibold text-theme-primary">Fab Alarm</span>

        <div className="w-px h-4 bg-border-subtle" />

        <nav className="flex items-center gap-0.5">
          <NavLink
            to="/issues"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                isActive
                  ? 'text-theme-accent bg-accent-subtle'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50'
              }`
            }
          >
            Issues
          </NavLink>
          <NavLink
            to="/alarms"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                isActive
                  ? 'text-theme-accent bg-accent-subtle'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50'
              }`
            }
          >
            Alarms
          </NavLink>
        </nav>

        <div className="flex-1" />
        <UserSwitcher />
        <div className="w-px h-4 bg-border-subtle" />
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
