import { ChevronDown, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useCurrentUserStore } from '../stores/currentUserStore';
import { USERS } from '../lib/users';

export function UserSwitcher() {
  const { currentUser, setCurrentUser } = useCurrentUserStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50 rounded-md transition-all duration-150"
      >
        <User className="w-3.5 h-3.5" />
        <span>{currentUser.name}</span>
        <span className="text-theme-muted">({currentUser.department})</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-surface-raised border border-border-default rounded-lg shadow-lg z-50 py-1 animate-fadeIn">
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-theme-muted">
            Switch User
          </div>
          {USERS.map((user) => (
            <button
              key={user.name}
              onClick={() => {
                setCurrentUser(user);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                currentUser.name === user.name
                  ? 'text-theme-accent bg-accent-subtle'
                  : 'text-theme-secondary hover:text-theme-primary hover:bg-surface-overlay/50'
              }`}
            >
              <span className="font-medium">{user.name}</span>
              <span className="text-theme-muted ml-1.5">({user.department})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
