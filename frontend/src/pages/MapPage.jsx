import { useEffect, useState, useCallback } from 'react';
import { MapPin, RefreshCw, Filter } from 'lucide-react';
import { reportsApi } from '../services/api';
import MapView from '../components/MapView';
import { PageHeader, Spinner, ErrorBanner } from '../components/UI';

const CATEGORIES = ['', 'water', 'electricity', 'roads', 'sanitation', 'health', 'food', 'shelter', 'infrastructure', 'air'];

export default function MapPage() {
  const [points,     setPoints]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [category,   setCategory]   = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.heatmap();
      let pts = res.points || [];
      if (category) pts = pts.filter((p) => p.category === category);
      setPoints(pts);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  // Stats derived from points
  const critical = points.filter((p) => p.urgencyScore >= 75).length;
  const medium   = points.filter((p) => p.urgencyScore >= 55 && p.urgencyScore < 75).length;
  const byCategory = CATEGORIES.slice(1).map((cat) => ({
    cat,
    count: points.filter((p) => p.category === cat).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Community Complaint Map"
        subtitle={`${points.length} active complaints mapped across Raipur`}
        action={
          <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Filter size={14} className="text-pulse-muted" />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                category === cat
                  ? 'border-pulse-teal text-pulse-teal bg-pulse-tealDark/20'
                  : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
              }`}
            >
              {cat || 'All Categories'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3">
          <p className="text-xs text-pulse-muted">Total Active</p>
          <p className="text-2xl font-bold text-pulse-text">{points.length}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-pulse-muted">Critical / High</p>
          <p className="text-2xl font-bold text-red-400">{critical}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-pulse-muted">Medium Priority</p>
          <p className="text-2xl font-bold text-amber-400">{medium}</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size={32} />
        </div>
      ) : (
        <>
          <MapView points={points} height="500px" />

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <div className="mt-4 card p-4">
              <p className="text-xs font-medium text-pulse-muted uppercase tracking-wider mb-3">
                Complaints by Category
              </p>
              <div className="flex flex-wrap gap-2">
                {byCategory.map(({ cat, count }) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-pulse-border hover:border-pulse-teal/60 transition-colors"
                  >
                    <span className="text-sm">{cat}</span>
                    <span className="text-xs font-bold text-pulse-teal bg-pulse-tealDark/30 px-1.5 py-0.5 rounded-full">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
