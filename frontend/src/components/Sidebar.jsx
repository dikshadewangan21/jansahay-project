import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, PlusCircle, Users,
  ClipboardList, BarChart3, Activity, MapPin,
  LogIn, LogOut, UserCircle, Brain, Map, X,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLang } from './LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationBell from './NotificationBell';

export default function Sidebar({ onClose }) {
  const { user, isLoggedIn, logout } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const NAV = [
    { to: '/dashboard',   label: t('nav.dashboard'),    icon: LayoutDashboard },
    { to: '/map',         label: t('nav.liveMap'),       icon: MapPin },
    { to: '/reports',     label: t('nav.reports'),       icon: FileText },
    { to: '/reports/new', label: t('nav.submitReport'),  icon: PlusCircle },
    { to: '/tasks',       label: t('nav.missions'),      icon: ClipboardList },
    { to: '/volunteers',  label: t('nav.volunteers'),    icon: Users },
    { to: '/ai',          label: t('nav.aiEngine'),      icon: Brain, badge: 'AI' },
    { to: '/crisis-map',  label: t('nav.crisisMap'),     icon: Map,   badge: 'AI' },
    { to: '/sdg',         label: t('nav.sdgImpact'),     icon: BarChart3 },
    { to: '/analytics',   label: t('nav.analytics'),     icon: Activity },
  ];

  function handleLogout() {
    logout();
    navigate('/login');
    onClose?.();
  }

  return (
    <aside className="w-56 h-full bg-pulse-surface border-r border-pulse-border flex flex-col">

      {/* Brand + mobile close */}
      <div className="px-5 py-5 border-b border-pulse-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pulse-teal/20 flex items-center justify-center shrink-0">
            <span className="text-base">🤝</span>
          </div>
          <div>
            <p className="text-sm font-bold text-pulse-text leading-tight">{t('app.name')}</p>
            <p className="text-[10px] text-pulse-muted leading-tight">{t('app.tagline')}</p>
          </div>
        </div>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-pulse-muted hover:text-pulse-text hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors duration-100 ${
                isActive
                  ? 'bg-pulse-tealDark text-pulse-teal font-medium'
                  : 'text-pulse-muted hover:text-pulse-text hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            <span className="truncate">{label}</span>
            {badge && (
              <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-pulse-teal/20 text-pulse-teal font-bold shrink-0">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Language switcher */}
      <div className="px-4 pt-3 pb-1 border-t border-pulse-border">
        <LanguageSwitcher />
      </div>

      {/* User footer */}
      <div className="px-4 py-3 pb-4">
        {isLoggedIn ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <UserCircle size={16} className="text-pulse-muted shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-pulse-text truncate">{user?.name}</p>
                  <p className="text-[10px] text-pulse-muted capitalize">{user?.role}</p>
                </div>
              </div>
              <NotificationBell />
            </div>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-pulse-muted hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <LogOut size={12} />{t('nav.signOut')}
            </button>
          </div>
        ) : (
          <NavLink to="/login" onClick={() => onClose?.()}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-pulse-muted hover:text-pulse-teal">
            <LogIn size={12} />{t('nav.signIn')}
          </NavLink>
        )}
      </div>
    </aside>
  );
}
