/**
 * NotificationBell Component (i18n-aware)
 */
import { useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, Trash2, Loader2, AlertCircle, MapPin, ClipboardList } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useLang } from './LanguageContext';

function TypeIcon({ type }) {
  const base = 'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs';
  if (type === 'new_report_match') return <div className={`${base} bg-blue-500/20 text-blue-400`}><MapPin size={13} /></div>;
  if (type === 'task_assigned')    return <div className={`${base} bg-green-500/20 text-green-400`}><ClipboardList size={13} /></div>;
  if (type === 'report_status')    return <div className={`${base} bg-amber-500/20 text-amber-400`}><AlertCircle size={13} /></div>;
  return <div className={`${base} bg-pulse-teal/20 text-pulse-teal`}><Bell size={13} /></div>;
}

function urgencyColour(level) {
  return { critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400' }[level] || 'text-pulse-teal';
}

export default function NotificationBell() {
  const { t } = useLang();
  const {
    notifications, unreadCount, loading,
    open, toggleOpen, setOpen,
    markRead, markAllRead, deleteNotification,
  } = useNotifications();

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return t('notifications.justNow');
    if (mins < 60) return t('notifications.minutesAgo', { n: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return t('notifications.hoursAgo', { n: hrs });
    return t('notifications.daysAgo', { n: Math.floor(hrs / 24) });
  }

  const wrapperRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  return (
    <div ref={wrapperRef} className="relative">
      <button onClick={toggleOpen} aria-label={t('notifications.title')}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-pulse-muted hover:text-pulse-teal hover:bg-white/5 transition-colors">
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 z-50 w-80 bg-pulse-surface border border-pulse-border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pulse-border">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-pulse-teal" />
              <span className="text-sm font-semibold text-pulse-text">{t('notifications.title')}</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={markAllRead} title={t('notifications.markAllRead')}
                  className="flex items-center gap-1 text-[11px] text-pulse-muted hover:text-pulse-teal transition-colors px-1.5 py-1 rounded">
                  <CheckCheck size={12} />{t('notifications.markAllRead')}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-pulse-muted hover:text-pulse-text ml-1"><X size={14} /></button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-pulse-muted">
                <Loader2 size={18} className="animate-spin mr-2" />
                <span className="text-sm">{t('notifications.loading')}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-pulse-muted">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-xs">{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}
                    className={`group flex gap-3 px-4 py-3 border-b border-pulse-border/50 transition-colors cursor-pointer ${n.isRead ? 'opacity-60' : 'bg-pulse-teal/5'} hover:bg-white/5`}
                    onClick={() => !n.isRead && markRead(n.id)}>
                    <TypeIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug mb-0.5 ${n.isRead ? 'text-pulse-muted' : 'text-pulse-text'}`}>{n.title}</p>
                      <p className="text-[11px] text-pulse-muted leading-snug line-clamp-2">{n.message}</p>
                      {n.meta?.urgencyLevel && <span className={`text-[10px] font-bold uppercase mt-1 inline-block ${urgencyColour(n.meta.urgencyLevel)}`}>{n.meta.urgencyLevel}</span>}
                      {n.meta?.matchScore && <span className="text-[10px] text-pulse-teal ml-2">Match: {n.meta.matchScore}/100</span>}
                      <p className="text-[10px] text-pulse-muted/60 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-pulse-teal mt-0.5" />}
                      <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                        className="opacity-0 group-hover:opacity-100 text-pulse-muted hover:text-red-400 transition-all" title={t('common.delete')}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
