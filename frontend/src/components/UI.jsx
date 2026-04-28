// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className = '' }) {
  return (
    <svg className={`animate-spin text-pulse-teal ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-pulse-text leading-tight">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-pulse-muted mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
      {Icon && <Icon size={32} className="text-pulse-muted mb-3 opacity-40" />}
      <p className="text-pulse-text font-medium text-sm">{title}</p>
      {message && <p className="text-xs sm:text-sm text-pulse-muted mt-1 max-w-xs">{message}</p>}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, iconColor = 'text-pulse-teal', sub, highlight }) {
  return (
    <div className={`card p-3 sm:p-4 ${highlight ? 'border-pulse-critical/50 bg-pulse-critical/5' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-pulse-muted uppercase tracking-wider leading-tight">{label}</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1 ${highlight ? 'text-pulse-critical' : 'text-pulse-text'}`}>
            {value}
          </p>
          {sub && <p className="text-[10px] sm:text-xs text-pulse-muted mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-1.5 sm:p-2 rounded-lg bg-white/5 shrink-0 ${iconColor}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  return (
    <div className="card border-pulse-critical/40 bg-pulse-critical/5 p-3 sm:p-4 flex items-center justify-between gap-3 mb-4">
      <p className="text-xs sm:text-sm text-pulse-critical">{message || 'Failed to load data.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-pulse-critical underline shrink-0">Retry</button>
      )}
    </div>
  );
}
