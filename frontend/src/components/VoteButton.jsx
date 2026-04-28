import { useState } from 'react';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { reportsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useNavigate } from 'react-router-dom';

/**
 * VoteButton — upvote / un-vote a complaint.
 * Requires auth. If not logged in, redirects to /login.
 */
export default function VoteButton({ reportId, initialCount = 0, initialVoted = false, size = 'sm' }) {
  const { isLoggedIn, updateVote } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [count,   setCount]   = useState(initialCount);
  const [voted,   setVoted]   = useState(initialVoted);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/reports` } });
      return;
    }
    setLoading(true);
    try {
      const res = await reportsApi.vote(reportId);
      setCount(res.voteCount);
      setVoted(res.hasVoted);
      updateVote(reportId, res.hasVoted);
      addToast(res.hasVoted ? 'Vote added' : 'Vote removed', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const isSm = size === 'sm';

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      title={voted ? 'Remove vote' : 'Upvote this complaint'}
      className={`inline-flex items-center gap-1.5 rounded-full border transition-all duration-150 disabled:opacity-60 ${
        voted
          ? 'border-pulse-teal bg-pulse-tealDark/30 text-pulse-teal'
          : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/60 hover:text-pulse-teal'
      } ${isSm ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
    >
      {loading
        ? <Loader2 size={isSm ? 11 : 13} className="animate-spin" />
        : <ThumbsUp size={isSm ? 11 : 13} className={voted ? 'fill-current' : ''} />
      }
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  );
}
