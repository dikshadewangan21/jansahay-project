const CONFIG = {
  critical: { label: 'Critical', dot: 'bg-pulse-critical urgency-critical-dot', text: 'text-pulse-critical', bg: 'bg-pulse-critical/10 border-pulse-critical/30' },
  high:     { label: 'High',     dot: 'bg-pulse-high',     text: 'text-pulse-high',     bg: 'bg-pulse-high/10 border-pulse-high/30' },
  medium:   { label: 'Medium',   dot: 'bg-pulse-medium',   text: 'text-pulse-medium',   bg: 'bg-pulse-medium/10 border-pulse-medium/30' },
  low:      { label: 'Low',      dot: 'bg-pulse-low',      text: 'text-pulse-low',      bg: 'bg-pulse-low/10 border-pulse-low/30' },
};

export default function UrgencyBadge({ level, score, showScore = true }) {
  const c = CONFIG[level] || CONFIG.low;
  return (
    <span className={`badge border ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
      {showScore && score !== undefined && (
        <span className="opacity-70 font-mono">{score}</span>
      )}
    </span>
  );
}
