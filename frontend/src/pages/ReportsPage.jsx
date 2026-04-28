import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Filter, PlusCircle, FileText, RefreshCw, TrendingUp, ThumbsUp, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { reportsApi } from '../services/api';
import { useToast } from '../components/ToastContext';
import { useLang  } from '../components/LanguageContext';
import { Spinner, PageHeader, EmptyState, ErrorBanner } from '../components/UI';
import ReportCard from '../components/ReportCard';

const CATEGORIES = ['', 'water', 'electricity', 'roads', 'sanitation', 'health', 'food', 'shelter', 'infrastructure', 'air'];
const STATUSES   = ['', 'open', 'assigned', 'in_progress', 'completed', 'rejected'];
const SOURCES    = ['', 'whatsapp', 'paper_survey', 'ngo_upload', 'iot', 'web', 'mobile'];

export default function ReportsPage() {
  const { addToast } = useToast();
  const { t }        = useLang();

  const SORT_OPTIONS = [
    { value: 'urgency', label: t('reports.sortByUrgency'), icon: TrendingUp },
    { value: 'votes',   label: t('reports.sortByVotes'),   icon: ThumbsUp },
    { value: 'newest',  label: t('reports.sortByNewest'),  icon: Clock },
  ];
  const URGENCY_OPTIONS = [
    { label: t('reports.anyUrgency'),  value: '' },
    { label: t('reports.critical90'),  value: '90' },
    { label: t('reports.high75'),      value: '75' },
    { label: t('reports.medium55'),    value: '55' },
  ];

  const [reports, setReports]     = useState([]);
  const [meta, setMeta]           = useState({ total: 0 });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters]     = useState({ category: '', status: '', source: '', minUrgency: '', sortBy: 'urgency' });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await reportsApi.list(params);
      setReports(res.data); setMeta(res.meta);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, status) {
    try {
      const updated = await reportsApi.updateStatus(id, status);
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      addToast(t('reports.statusUpdated', { status }), 'success');
    } catch (e) { addToast(e.message, 'error'); }
  }

  function setFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })); }

  const criticalCount = reports.filter((r) => r.urgencyScore >= 75 && r.status !== 'completed').length;
  const breachedCount = reports.filter((r) => r.slaStatus === 'breached' || r.slaNow?.status === 'breached').length;

  const filterConfigs = [
    { key: 'category',   label: t('reports.category'),   options: CATEGORIES.map((c) => ({ value: c, label: c || t('reports.allCategories') })) },
    { key: 'status',     label: t('reports.status'),     options: STATUSES.map((s)   => ({ value: s, label: s   || t('reports.allStatuses')   })) },
    { key: 'source',     label: t('reports.source'),     options: SOURCES.map((s)    => ({ value: s, label: s   || t('reports.allSources')    })) },
    { key: 'minUrgency', label: t('reports.minUrgency'), options: URGENCY_OPTIONS },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.totalComplaints', { count: meta.total })}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => load(true)} disabled={refreshing} className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{t('reports.refresh')}</span>
            </button>
            <Link to="/reports/new" className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
              <PlusCircle size={13} />
              <span className="hidden sm:inline">{t('reports.submitReport')}</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        }
      />

      {/* Quick-filter chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {criticalCount > 0 && (
          <button onClick={() => setFilter('minUrgency', '75')}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors">
            🔴 {criticalCount} {t('reports.criticalHighPriority')}
          </button>
        )}
        {breachedCount > 0 && (
          <button onClick={() => setFilter('minUrgency', '')}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors">
            ⚠️ {breachedCount} {t('reports.slaBreached')}
          </button>
        )}
        {(filters.category || filters.status || filters.minUrgency) && (
          <button onClick={() => setFilters({ category: '', status: '', source: '', minUrgency: '', sortBy: filters.sortBy })}
            className="text-xs px-3 py-1 rounded-full border border-pulse-border text-pulse-muted hover:border-pulse-teal/60 transition-colors">
            {t('reports.clearFilters')}
          </button>
        )}
      </div>

      {/* Sort + filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1.5">
          {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setFilter('sortBy', value)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                filters.sortBy === value ? 'border-pulse-teal text-pulse-teal bg-pulse-tealDark/20' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
              }`}>
              <Icon size={10} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            showFilters ? 'border-pulse-teal text-pulse-teal' : 'border-pulse-border text-pulse-muted hover:border-pulse-teal/50'
          }`}>
          <Filter size={10} />
          {t('reports.filters')}
          {showFilters ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {/* Expanded filters — responsive grid */}
      {showFilters && (
        <div className="card p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {filterConfigs.map(({ key, label, options }) => (
            <div key={key}>
              <label className="block text-[10px] text-pulse-muted uppercase tracking-wider mb-1">{label}</label>
              <select value={filters[key]} onChange={(e) => setFilter(key, e.target.value)}
                className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-2 py-1.5 text-xs text-pulse-text outline-none focus:border-pulse-teal">
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner size={32} /></div>
      ) : reports.length === 0 ? (
        <EmptyState icon={FileText} title={t('reports.noReports')} message={t('reports.noReportsHint')} />
      ) : (
        /* Single col on mobile, 2 col on lg */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {!loading && reports.length > 0 && (
        <p className="text-xs text-pulse-muted text-center mt-6">
          {t('reports.showing', { shown: reports.length, total: meta.total })}
        </p>
      )}
    </div>
  );
}
