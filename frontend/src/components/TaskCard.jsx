import { useState } from 'react';
import { MapPin, Clock, User, CheckCircle2, Loader2 } from 'lucide-react';
import UrgencyBadge from './UrgencyBadge';
import { CategoryBadge, StatusBadge } from './Badges';
import { tasksApi, volunteersApi } from '../services/api';
import { useToast } from './ToastContext';

const SDG_COLOR = { 1:'bg-yellow-600', 2:'bg-yellow-500', 3:'bg-green-600',
  6:'bg-cyan-600', 9:'bg-orange-600', 10:'bg-pink-600',
  11:'bg-orange-500', 13:'bg-green-700', 17:'bg-blue-600' };

function timeAgo(iso) {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3600000);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

export default function TaskCard({ task, onUpdate }) {
  const { addToast } = useToast();
  const [matching, setMatching]   = useState(false);
  const [matches, setMatches]     = useState(null);
  const [completing, setCompleting] = useState(false);
  const [assigning, setAssigning] = useState(null); // volunteerId being assigned

  async function handleFindVolunteers() {
    setMatching(true);
    try {
      const res = await volunteersApi.matchForTask(task.id);
      setMatches(res.matches);
      if (res.matches.length === 0) addToast('No available volunteers match this task right now.', 'warning');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setMatching(false);
    }
  }

  async function handleAssign(volunteerId, volunteerName) {
    setAssigning(volunteerId);
    try {
      await tasksApi.assign(task.id, volunteerId);
      addToast(`Assigned to ${volunteerName}`, 'success');
      setMatches(null);
      onUpdate?.();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAssigning(null);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await tasksApi.complete(task.id, { notes: 'Marked complete via NGO dashboard.' });
      addToast('Task marked as completed.', 'success');
      onUpdate?.();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="card p-4 hover:border-pulse-teal/30 transition-colors duration-150">
      {/* Title + urgency */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-pulse-text leading-snug flex-1">{task.title}</p>
        <UrgencyBadge level={task.urgencyLevel} score={task.urgencyScore} />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <CategoryBadge category={task.category} />
        <StatusBadge status={task.status} />
        {task.estimatedHours && (
          <span className="badge border border-pulse-border text-pulse-muted">
            <Clock size={10} /> ~{task.estimatedHours}h
          </span>
        )}
      </div>

      <p className="text-xs text-pulse-muted leading-relaxed mb-3 line-clamp-2">
        {task.description}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-pulse-muted mb-3">
        <span className="flex items-center gap-1"><MapPin size={11} />{task.location?.area}</span>
        <span className="flex items-center gap-1 ml-auto"><Clock size={11} />{timeAgo(task.createdAt)}</span>
      </div>

      {/* SDG goals */}
      {task.sdgGoals?.length > 0 && (
        <div className="flex gap-1 mb-3">
          {task.sdgGoals.map((g) => (
            <span key={g} className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${SDG_COLOR[g] || 'bg-gray-600'}`}>
              SDG {g}
            </span>
          ))}
        </div>
      )}

      {/* Assigned volunteer */}
      {task.status === 'in-progress' && task.assignedVolunteerId && (
        <div className="flex items-center gap-2 bg-pulse-tealDark/30 rounded-lg px-3 py-2 mb-3">
          <User size={13} className="text-pulse-teal" />
          <span className="text-xs text-pulse-teal font-medium">Volunteer assigned</span>
        </div>
      )}

      {/* Completed state */}
      {task.status === 'completed' && (
        <div className="flex items-center gap-2 text-xs text-pulse-low">
          <CheckCircle2 size={13} /> Completed {task.completedAt ? timeAgo(task.completedAt) : ''}
        </div>
      )}

      {/* Actions */}
      {task.status !== 'completed' && (
        <div className="border-t border-pulse-border pt-3 flex gap-2 flex-wrap">
          {task.status === 'open' && (
            <button
              onClick={handleFindVolunteers}
              disabled={matching}
              className="btn-ghost text-xs py-1 flex items-center gap-1"
            >
              {matching ? <Loader2 size={12} className="animate-spin" /> : null}
              {matching ? 'Matching…' : 'Find Volunteers'}
            </button>
          )}
          {(task.status === 'open' || task.status === 'in-progress') && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="btn-ghost text-xs py-1 hover:border-pulse-teal hover:text-pulse-teal flex items-center gap-1"
            >
              {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Mark Complete
            </button>
          )}
        </div>
      )}

      {/* Volunteer match results */}
      {matches && matches.length > 0 && (
        <div className="mt-3 border-t border-pulse-border pt-3 space-y-2">
          <p className="text-xs font-medium text-pulse-muted uppercase tracking-wider">Top Matches</p>
          {matches.slice(0, 3).map((v) => (
            <div key={v.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium text-pulse-text">{v.name}</p>
                <p className="text-[10px] text-pulse-muted">
                  {v.distanceKm}km away · Score {v.matchScore} · ⭐ {v.rating}
                </p>
                <p className="text-[10px] text-pulse-teal">{v.matchedSkills.join(', ')}</p>
              </div>
              <button
                onClick={() => handleAssign(v.id, v.name)}
                disabled={assigning === v.id}
                className="btn-primary text-xs py-1 px-2"
              >
                {assigning === v.id ? <Loader2 size={11} className="animate-spin" /> : 'Assign'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
