import { useState, useEffect } from 'react';
import { Map, AlertTriangle, TrendingUp, Clock, Loader2, RefreshCw } from 'lucide-react';
import { aiApi } from '../services/api';
import { Spinner, PageHeader } from '../components/UI';

const STATUS_CONFIG = {
  FUTURE_CRISIS: { color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: '🔴 Future Crisis', dot: '🔴' },
  AT_RISK:       { color: '#f97316', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: '🟠 At Risk', dot: '🟠' },
  STABLE:        { color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', label: '🟢 Stable', dot: '🟢' },
};

export default function CrisisMapPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('ALL');

  async function load() {
    setLoading(true);
    try {
      const res = await aiApi.crisisPredictions();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const predictions = data?.predictions || [];
  const summary = data?.summary || {};

  const filtered = filter === 'ALL' ? predictions : predictions.filter((p) => p.status === filter);

  return (
    <div className="p-6">
      <PageHeader
        title="🔮 Predictive Crisis Map"
        subtitle="AI-powered early warning system — predict problems before they happen"
        action={
          <button onClick={load} disabled={loading} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size={32} /></div>
      ) : (
        <>
          {/* Alert Banner */}
          {summary.alertMessage && (
            <div className={`mb-4 p-4 rounded-lg border text-sm font-medium ${
              summary.crisisCount > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
              summary.riskCount > 0   ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                                        'bg-green-500/10 border-green-500/30 text-green-400'
            }`}>
              {summary.alertMessage}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Wards', value: summary.totalWards || 0, color: 'text-pulse-text' },
              { label: '🔴 Crisis', value: summary.crisisCount || 0, color: 'text-red-400' },
              { label: '🟠 At Risk', value: summary.riskCount || 0, color: 'text-orange-400' },
              { label: '🟢 Stable', value: summary.stableCount || 0, color: 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-pulse-muted mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Visual Map Placeholder (SVG-based ward grid) */}
          <div className="card p-4 mb-6">
            <h3 className="text-sm font-semibold text-pulse-text mb-4">Ward Risk Visualization</h3>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {predictions.map((p) => {
                const cfg = STATUS_CONFIG[p.status];
                return (
                  <div
                    key={p.ward}
                    title={p.predictionText}
                    className={`rounded-lg p-2 border text-center cursor-default ${cfg.bg} ${cfg.border}`}
                  >
                    <div className="text-base mb-1">{cfg.dot}</div>
                    <div className="text-[9px] text-pulse-text font-medium truncate">{p.ward}</div>
                    <div className="text-[9px] text-pulse-muted">{p.riskScore}%</div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-pulse-muted">
              <span>🟢 Stable</span>
              <span>🟠 At Risk — elevated threat detected</span>
              <span>🔴 Crisis — intervention needed soon</span>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mb-4">
            {['ALL', 'FUTURE_CRISIS', 'AT_RISK', 'STABLE'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f ? 'border-pulse-teal text-pulse-teal bg-pulse-tealDark/20' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
                }`}
              >
                {f === 'ALL' ? 'All Wards' : STATUS_CONFIG[f]?.label}
              </button>
            ))}
          </div>

          {/* Predictions List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const cfg = STATUS_CONFIG[p.status];
              return (
                <div key={p.ward} className={`card p-4 border-l-4 ${p.status === 'FUTURE_CRISIS' ? 'border-l-red-500' : p.status === 'AT_RISK' ? 'border-l-orange-500' : 'border-l-green-500'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-pulse-text">{p.ward}</p>
                      <p className="text-xs text-pulse-muted">{p.area}</p>
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                      {p.riskScore}%
                    </div>
                  </div>

                  <p className={`text-xs font-medium mb-2 ${cfg.text}`}>{cfg.label}</p>

                  <p className="text-[11px] text-pulse-muted mb-3 leading-relaxed">{p.predictionText}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.categories.map(({ category, count }) => (
                      <span key={category} className="text-[9px] px-2 py-0.5 rounded-full bg-pulse-bg border border-pulse-border text-pulse-muted capitalize">
                        {category} ({count})
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-pulse-bg rounded p-1.5">
                      <p className="text-xs font-bold text-pulse-text">{p.totalReports}</p>
                      <p className="text-[9px] text-pulse-muted">Total</p>
                    </div>
                    <div className="bg-pulse-bg rounded p-1.5">
                      <p className="text-xs font-bold text-pulse-text">{p.recentReports}</p>
                      <p className="text-[9px] text-pulse-muted">30d</p>
                    </div>
                    <div className="bg-pulse-bg rounded p-1.5">
                      <p className="text-xs font-bold text-pulse-text">{p.confidence}%</p>
                      <p className="text-[9px] text-pulse-muted">Conf.</p>
                    </div>
                  </div>

                  {p.daysToEvent && (
                    <div className={`mt-2 text-[10px] text-center py-1 rounded ${cfg.bg} ${cfg.text} font-medium`}>
                      ⏰ Crisis in ~{p.daysToEvent} day{p.daysToEvent !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
