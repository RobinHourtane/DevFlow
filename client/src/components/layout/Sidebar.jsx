import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  Bot, BarChart3, LogOut, Settings, CalendarDays, ListChecks, Receipt, Bell, Search, Sun, Moon
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import api from '../../lib/api';

const NAV = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/my-tasks',      icon: ListChecks,      label: 'Mes tâches'    },
  { to: '/projects',      icon: FolderKanban,    label: 'Projets'       },
  { to: '/clients',       icon: Users,           label: 'Clients'       },
  { to: '/calendar',      icon: CalendarDays,    label: 'Calendrier'    },
  { to: '/contracts',     icon: FileText,        label: 'Contrats'      },
  { to: '/invoices',      icon: Receipt,         label: 'Factures'      },
  { to: '/notifications', icon: Bell,            label: 'Notifications', badge: true },
  { to: '/agents',        icon: Bot,             label: 'Agents IA'     },
  { to: '/analytics',     icon: BarChart3,       label: 'Stats'         },
];

export default function Sidebar({ onSearchOpen }) {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchCount = () => api.get('/notifications')
      .then(({ data }) => { if (!cancelled) setUnreadCount(data.unreadCount || 0); })
      .catch(() => {});
    fetchCount();
    const interval = setInterval(fetchCount, 90_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user]);

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[var(--card)]"
      style={{ borderRight: '1px solid var(--border-1)' }}>

      {/* Logo */}
      <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--border-1)' }}>
        <div className="label-mono mb-1">DevFlow / AI</div>
        <div className="font-display text-2xl text-[var(--text-1)]">
          DevFlow<span style={{ color: 'var(--accent)' }}>.</span>
        </div>
      </div>

      {/* Recherche globale */}
      <div className="px-3 pt-4 pb-2">
        <button onClick={onSearchOpen}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-4)] hover:text-[var(--text-2)] transition-colors"
          style={{ border: '1px solid var(--border-2)', background: 'var(--bg-0)', borderRadius: '8px' }}>
          <Search size={13} />
          <span className="flex-1 text-left text-xs">Rechercher…</span>
          <kbd className="label-mono text-[var(--text-5)]" style={{ fontSize: '9px', border: '1px solid var(--border-2)', padding: '1px 4px', borderRadius: '4px' }}>⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors duration-150 ${
                isActive
                  ? 'text-[var(--accent)] font-medium bg-[color-mix(in_srgb,var(--accent)_9%,transparent)]'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-1)]'
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={15} strokeWidth={1.6}
                  style={{ color: isActive ? 'var(--accent)' : undefined }} />
                <span className="flex-1">{label}</span>
                {badge && unreadCount > 0 && (
                  <span className="label-mono px-1.5 py-0.5 leading-none text-[10px] font-semibold text-[var(--text-1)]"
                    style={{ background: '#ef4444', borderRadius: '999px', minWidth: '18px', textAlign: 'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--border-1)' }} className="px-4 py-4 space-y-3">
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-1)] transition-colors">
          {theme === 'dark' ? <Sun size={15} strokeWidth={1.6} /> : <Moon size={15} strokeWidth={1.6} />}
          {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
        </button>

        <NavLink to="/settings"
          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-1)] transition-colors">
          <Settings size={15} strokeWidth={1.6} />
          Paramètres
        </NavLink>

        {user && (
          <div className="flex items-center gap-3 px-1 py-2">
            <div className="h-8 w-8 flex items-center justify-center text-xs font-semibold text-[var(--text-1)] shrink-0"
              style={{ background: 'var(--accent)', borderRadius: '8px' }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-[var(--text-1)] truncate">{user.name}</div>
              <div className="text-xs text-[var(--text-3)] truncate font-mono">{user.email}</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              title="Déconnexion"
              className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors p-1">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
