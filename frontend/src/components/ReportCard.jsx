import { MapPin, Users, Clock, Sparkles, Image } from 'lucide-react';
import UrgencyBadge from './UrgencyBadge';
import { CategoryBadge, SourceBadge, StatusBadge } from './Badges';
import SLABadge   from './SLABadge';
import VoteButton from './VoteButton';
import { useAuth } from './AuthContext';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ReportCard({ report, onStatusChange, compact = false }) {
  const { hasVotedOn, isVolunteer } = useAuth();
  const voted = hasVotedOn(report.id);

  // Use real-time SLA status if available, else stored one
  const slaStatus = report.slaNow?.status || report.slaStatus;
  const hoursLeft = report.slaNow?.hoursRemaining;

  return (
    <div className={`card p-4 hover:border-pulse-teal/40 transition-colors duration-150 ${
      slaStatus === 'breached' ? 'border-red-500/30 bg-red-500/5' : ''
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-sm font-semibold text-pulse-text leading-snug truncate">{report.title}</p>
            {/* AI suggested category indicator */}
            {report.aiCategory && report.aiCategory !== report.category && (
              <span title={`AI suggested: ${report.aiCategory}`} className="shrink-0">
                <Sparkles size={11} className="text-pulse-teal opacity-70" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <CategoryBadge category={report.category} />
            <SourceBadge   source={report.source} />
            <StatusBadge   status={report.status} />
            {/* SLA badge — only when relevant */}
            {slaStatus && slaStatus !== 'on_time' && (
              <SLABadge slaStatus={slaStatus} hoursRemaining={hoursLeft} />
            )}
          </div>
        </div>
        <UrgencyBadge level={report.urgencyLevel} score={report.urgencyScore} />
      </div>

      {!compact && (
        <p className="text-xs text-pulse-muted leading-relaxed mb-3 line-clamp-2">
          {report.description}
        </p>
      )}

      {/* Images indicator */}
      {!compact && report.images?.length > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-pulse-muted mb-2">
          <Image size={11} />
          <span>{report.images.length} image{report.images.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-pulse-muted">
        <span className="flex items-center gap-1">
          <MapPin size={11} />
          {report.location?.area}, {report.location?.ward}
        </span>
        {report.affectedCount > 0 && (
          <span className="flex items-center gap-1">
            <Users size={11} />
            {report.affectedCount.toLocaleString()} affected
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock size={11} />
          {timeAgo(report.createdAt)}
        </span>
      </div>

      {/* Tags */}
      {!compact && report.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {report.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-pulse-muted border border-pulse-border">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action row — vote + status change */}
      <div className="mt-3 pt-3 border-t border-pulse-border flex items-center justify-between gap-2">
        {/* Vote button — always visible */}
        <VoteButton
          reportId={report.id}
          initialCount={report.voteCount || 0}
          initialVoted={voted}
          size="sm"
        />

        {/* Status controls — volunteers/admins only */}
        {onStatusChange && isVolunteer && report.status !== 'completed' && (
          <div className="flex gap-2">
            {report.status === 'open' && (
              <button
                onClick={() => onStatusChange(report.id, 'assigned')}
                className="text-xs btn-ghost py-1 px-2"
              >
                Assign
              </button>
            )}
            {report.status === 'assigned' && (
              <button
                onClick={() => onStatusChange(report.id, 'in_progress')}
                className="text-xs btn-ghost py-1 px-2"
              >
                In Progress
              </button>
            )}
            <button
              onClick={() => onStatusChange(report.id, 'completed')}
              className="text-xs btn-ghost py-1 px-2 hover:border-pulse-teal hover:text-pulse-teal"
            >
              Resolve ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
