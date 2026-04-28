import { Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

/**
 * SLABadge — shows SLA compliance status for a complaint.
 * Props:
 *   slaStatus: 'on_time' | 'at_risk' | 'breached' | 'resolved'
 *   hoursRemaining: number | null
 */
export default function SLABadge({ slaStatus, hoursRemaining }) {
  if (!slaStatus) return null;

  const config = {
    on_time:  { label: 'On Time',  icon: Clock,         color: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/30' },
    at_risk:  { label: 'At Risk',  icon: AlertTriangle, color: 'text-amber-400',    bg: 'bg-amber-500/10 border-amber-500/30' },
    breached: { label: 'SLA Breach', icon: XCircle,     color: 'text-red-400',      bg: 'bg-red-500/10 border-red-500/30' },
    resolved: { label: 'Resolved', icon: CheckCircle2,  color: 'text-pulse-teal',   bg: 'bg-pulse-tealDark/20 border-pulse-teal/30' },
  }[slaStatus] || { label: slaStatus, icon: Clock, color: 'text-pulse-muted', bg: 'bg-pulse-bg border-pulse-border' };

  const Icon = config.icon;

  function formatHours(h) {
    if (h === null || h === undefined) return '';
    if (h < 0) return `${Math.abs(h).toFixed(0)}h overdue`;
    if (h < 24) return `${h.toFixed(0)}h left`;
    return `${(h / 24).toFixed(1)}d left`;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.color} ${config.bg}`}>
      <Icon size={10} />
      {config.label}
      {hoursRemaining !== null && hoursRemaining !== undefined && slaStatus !== 'resolved' && (
        <span className="opacity-75 ml-0.5">· {formatHours(hoursRemaining)}</span>
      )}
    </span>
  );
}
